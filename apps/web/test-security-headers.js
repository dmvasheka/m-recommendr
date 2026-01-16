#!/usr/bin/env node

/**
 * Test script to verify security headers configuration
 * Run: node test-security-headers.js
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Read the config
const config = require('./next.config.js').default;

console.log('🔒 Security Headers Configuration Test\n');
console.log('=' .repeat(60));

async function testHeaders() {
    try {
        const headers = await config.headers();

        if (!headers || headers.length === 0) {
            console.log('❌ No headers configured!');
            return;
        }

        const route = headers[0];
        console.log(`\n📍 Route: ${route.source}\n`);

        const headerMap = {};
        route.headers.forEach(h => {
            headerMap[h.key] = h.value;
        });

        // Check critical security headers
        const criticalHeaders = {
            'Content-Security-Policy': '🛡️  CSP (XSS Protection)',
            'X-Content-Type-Options': '🔒 MIME Sniffing Protection',
            'X-Frame-Options': '🚫 Clickjacking Protection',
            'X-XSS-Protection': '⚔️  XSS Filter',
            'Referrer-Policy': '🔗 Referrer Control',
            'Permissions-Policy': '🎛️  Feature Policy',
        };

        console.log('Critical Security Headers:');
        console.log('-'.repeat(60));

        let allPresent = true;
        for (const [header, description] of Object.entries(criticalHeaders)) {
            if (headerMap[header]) {
                console.log(`✅ ${description}`);
                console.log(`   ${header}: ${headerMap[header].substring(0, 80)}${headerMap[header].length > 80 ? '...' : ''}\n`);
            } else {
                console.log(`❌ ${description} - NOT CONFIGURED\n`);
                allPresent = false;
            }
        }

        // HSTS check (production only)
        console.log('\nProduction-Only Headers:');
        console.log('-'.repeat(60));
        console.log(`ℹ️  Strict-Transport-Security (HSTS)`);
        console.log(`   Configured for: ${process.env.NODE_ENV === 'production' ? 'PRODUCTION ONLY' : 'PRODUCTION ONLY (not in dev)'}\n`);

        // CSP Details
        if (headerMap['Content-Security-Policy']) {
            console.log('\nContent Security Policy Details:');
            console.log('-'.repeat(60));
            const cspDirectives = headerMap['Content-Security-Policy'].split('; ');
            cspDirectives.forEach(directive => {
                console.log(`  • ${directive}`);
            });
        }

        console.log('\n' + '='.repeat(60));
        if (allPresent) {
            console.log('✅ Security headers are properly configured!');
            console.log('   All critical headers are present.');
        } else {
            console.log('⚠️  Some security headers are missing!');
            console.log('   Please check the configuration.');
        }
        console.log('='.repeat(60));

        process.exit(allPresent ? 0 : 1);

    } catch (error) {
        console.error('❌ Error reading headers:', error.message);
        process.exit(1);
    }
}

testHeaders();
