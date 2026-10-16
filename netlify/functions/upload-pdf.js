const { createClient } = require('@supabase/supabase-js');
const { createHash, randomUUID } = require('node:crypto');

exports.createHandler = ({ createClientFn = createClient, createId = randomUUID, env = process.env } = {}) => async event => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
    };
    const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
    if (event.httpMethod !== 'POST') return reply(405, { message: 'Method Not Allowed' });

    let payload;
    try { payload = JSON.parse(event.body); }
    catch { return reply(400, { message: 'Invalid JSON payload' }); }
    const { fileName, pdfBase64, sha256: expectedHash } = payload || {};
    if (typeof fileName !== 'string' || !/^[A-Za-z0-9_-]+_\d{4}-\d{2}-\d{2}\.pdf$/.test(fileName) || fileName.length > 220) {
        return reply(400, { message: 'Invalid PDF file name.' });
    }
    if (typeof pdfBase64 !== 'string' || !pdfBase64 || pdfBase64.length > 7 * 1024 * 1024) {
        return reply(400, { message: 'A PDF of at most 5MB is required.' });
    }
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    if (pdfBuffer.length > 5 * 1024 * 1024 || pdfBuffer.subarray(0, 5).toString() !== '%PDF-') {
        return reply(400, { message: 'Invalid or oversized PDF.' });
    }
    const sha256 = createHash('sha256').update(pdfBuffer).digest('hex');
    if (expectedHash && expectedHash !== sha256) return reply(400, { message: 'The PDF checksum does not match.' });

    const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return reply(500, { message: 'PDF storage is not configured.' });
    try {
        const supabase = createClientFn(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
        // Immutable storage objects: never overwrite an earlier guest submission.
        // Even an older cached client receives a fresh, non-colliding URL.
        const filePath = `public/${createId()}_${fileName}`;
        const bucket = supabase.storage.from('pdfs');
        const { error } = await bucket.upload(filePath, pdfBuffer, {
            contentType: 'application/pdf', cacheControl: '0', upsert: false,
        });
        if (error) return reply(500, { message: 'Unable to store the signed PDF. Please retry.' });
        const { data } = bucket.getPublicUrl(filePath);
        if (!data?.publicUrl) return reply(500, { message: 'Unable to retrieve the signed PDF URL.' });
        return reply(200, { publicUrl: data.publicUrl, filePath, sha256 });
    } catch {
        return reply(500, { message: 'Unable to store the signed PDF. Please retry.' });
    }
};

exports.handler = exports.createHandler();
