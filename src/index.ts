import { exchangeCode, refreshTokens, getUserInfo, getRequest, isInGuild, makeRequest, GEN_API_ROUTE } from "./util/discord";
import config from '../config.json';
import { urlencoded, json } from "body-parser";
import cookies from 'cookie-parser'
import fs from 'fs'
import path from 'path'

import express from 'express';
const app = express();

// ***REMOVED***

const GEN_AUTH_URL = () => `https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUrl)}&response_type=code&scope=${encodeURIComponent((config.applicationIntents).join(' '))}`

const refreshTokenMaxAge = 1000 * 60 * 60 * 24 * 7 * 2; // two weeks
const makeSecureCookieConfig = (secure, maxAge = refreshTokenMaxAge) => { return { httpOnly: true, secure: secure, maxAge: maxAge } }

app.use(cookies())
app.use(json())
app.use(urlencoded({ extended: true }))

enum Cookies {
    Access = 'access_token',
    Refresh = 'refresh_token',
}

app.get('/api/oauth2/exchange', async (req, res) => {
    let code = req.query['code'];
    if (!code) return res.send('code is undefined')

    let codeRes = await exchangeCode(code.toString());
    res.cookie(Cookies.Refresh,
        codeRes['refresh_token'],
        makeSecureCookieConfig(req.secure));

    res.cookie(Cookies.Access,
        codeRes['access_token'],
        makeSecureCookieConfig(req.secure, codeRes['expires_in']));

    res.redirect('/success')
});

app.get('/api/oauth2/refresh', async (req, res) => {
    let fromBrowser = !req.query['redirect'];
    const redirectURL = req.query['redirect-url'];
    const refreshToken = req.cookies[Cookies.Refresh];
    if (!refreshToken) {
        if (fromBrowser) return res.redirect(config.authUrl);
        else return res.status(401);
    };

    let aT = await refreshTokens(refreshToken);
    res.cookie(Cookies.Refresh,
        aT['refresh_token'],
        makeSecureCookieConfig(req.secure));

    res.cookie(Cookies.Access,
        aT['access_token'],
        makeSecureCookieConfig(req.secure, aT['expires_in']));

    if (fromBrowser) {
        if (redirectURL) res.redirect(redirectURL.toString());
        else res.redirect('/success');
    } else res.end()
});

app.get('/api/oauth2/user', async (req, res) => {
    const redirectURL = req.query['redirect-uri']
    const accessToken = req.cookies[Cookies.Access];
    if (!accessToken) return res.json({ error: 'no access token' }) && res.status(401);

    let aT = await getUserInfo(accessToken);
    res.json(aT);
    res.status(200);

    if (redirectURL) res.redirect(redirectURL.toString());
});

app.get('/api/oauth2/hasauthorized', (req, res) => {
    const refreshToken = req.cookies[Cookies.Refresh];
    const accessToken = req.cookies[Cookies.Access];
    if (!refreshToken) res.status(400);
    else if (!accessToken) res.status(202);
    else res.status(200)
    res.end()
});

app.get('/api/oauth2/authurl', (req, res) => {
    let authUrl = GEN_AUTH_URL();

    res.send(authUrl)
    res.end()
});

app.post('/api/submitresource', async (req, res) => {
    const accessToken = req.cookies[Cookies.Access];
    let url = req.query['resource'].toString();
    url = "https://"+(url.replace(/http?s\:\/\//g, ''));
    if (!accessToken) return res.send('no access token') && res.status(401);

    if (!isInGuild(accessToken, 'GUILD_ID_HERE')) return res.send('not in guild') && res.status(401);

    getRequest(url).then(async ({ statusCode }) => {
        console.log(statusCode)

        if (statusCode >= 200 && statusCode < 400) {
            let info = await getUserInfo(accessToken);
            console.log(info)
            makeRequest({
                content: url,
                username: info.username,
                avatar_url: `https://cdn.discordapp.com/avatars/${info.id}/${info.avatar}.png`
            }, "TARGET_WEBHOOK_HERE")

            res.status(201);
        } else res.status(400);
        res.end();
    });

});

app.get('/', async (req, res) => {
    if (!req.cookies[Cookies.Refresh]) return res.redirect(GEN_AUTH_URL());

    res.sendFile(path.join(__dirname, "/routes/index.html"))
});

app.get('/**', async (req, res) => {
    if (req.url == '/') return;
    res.status(308)
    res.redirect('/')
});

app.listen(config.port, () => console.log('Webserver started on port: ' + config.port));