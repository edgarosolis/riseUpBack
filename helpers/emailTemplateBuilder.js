/**
 * Generates HTML email from structured content fields.
 * This keeps the HTML layout controlled by code while letting
 * admins edit only the text content.
 */

const buildEmailHtml = (slug, content) => {
    const { heading, greeting, bodyText, buttonText, footerText, expiryText } = content;

    // Convert **text** to <strong>text</strong> for bold
    const processedBody = (bodyText || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Split body into paragraphs (by newline)
    const bodyParagraphs = processedBody
        .split('\n')
        .filter(p => p.trim())
        .map(p => `<p style="color: #666; font-size: 16px; margin-bottom: 10px;">${p}</p>`)
        .join('\n        ');

    let contentHtml = '';

    if (slug === 'otp-login') {
        contentHtml = `
        ${bodyParagraphs}
        <div style="background-color: #fff; border: 2px solid #007bff; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #007bff;">
                {{code}}
            </span>
        </div>
        ${expiryText ? `<p style="color: #999; font-size: 14px; margin-top: 30px;">${expiryText}</p>` : ''}
        ${footerText ? `<p style="color: #999; font-size: 12px; margin-top: 20px;">${footerText}</p>` : ''}`;
    } else if (slug === 'admin-welcome') {
        contentHtml = `
        ${greeting ? `<p style="color: #666; font-size: 16px; margin-bottom: 10px;">${greeting}</p>` : ''}
        ${bodyParagraphs}
        <div style="background-color: #fff; border: 2px solid #007bff; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: left;">
            <p style="margin: 5px 0;"><strong>Email:</strong> {{email}}</p>
            <p style="margin: 5px 0;"><strong>Password:</strong> {{password}}</p>
        </div>
        ${footerText ? `<p style="color: #999; font-size: 12px; margin-top: 20px;">${footerText}</p>` : ''}`;
    } else {
        // 360 invitation & reminder templates
        contentHtml = `
        ${greeting ? `<p style="color: #666; font-size: 16px; margin-bottom: 10px;">${greeting}</p>` : ''}
        ${bodyParagraphs}
        ${buttonText ? `
        <a href="{{reviewUrl}}" style="display: inline-block; background-color: #F4C542; color: #000; font-weight: bold; font-size: 18px; padding: 14px 40px; border-radius: 8px; text-decoration: none; margin-top: 10px;">
            ${buttonText}
        </a>` : ''}
        ${footerText ? `
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
            ${footerText}<br>
            <a href="{{reviewUrl}}" style="color: #007bff;">{{reviewUrl}}</a>
        </p>` : ''}`;
    }

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; text-align: center;">
        <h1 style="color: #333; margin-bottom: 20px;">${heading || 'Rise Up Culture'}</h1>
        ${contentHtml}
    </div>
</body>
</html>`;
};

const buildTextBody = (slug, content) => {
    const { greeting, bodyText, footerText, expiryText } = content;
    const parts = [];

    if (greeting) parts.push(greeting);

    // Strip markdown bold
    if (bodyText) parts.push(bodyText.replace(/\*\*(.*?)\*\*/g, '$1'));

    if (slug === 'otp-login') {
        parts.push('{{code}}');
        if (expiryText) parts.push(expiryText);
    } else if (slug === 'admin-welcome') {
        parts.push('Email: {{email}}');
        parts.push('Password: {{password}}');
    } else {
        parts.push('{{reviewUrl}}');
    }

    if (footerText) parts.push(footerText);

    return parts.join(' ');
};

module.exports = { buildEmailHtml, buildTextBody };
