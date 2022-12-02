import { addUserToGuild, exchangeCode, getAccessToken, getAvatar, getUserInfo } from "./util/discord";
import config from '../config.json';
import { urlencoded, json } from "body-parser";
import cookies from 'cookie-parser'
import fs from 'fs'
import path from 'path'

import express from 'express';
const app = express();

// ***REMOVED***

const GEN_AUTH_URL = (bot = false) => `https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUrl)}&response_type=code&scope=${encodeURIComponent((config.applicationIntents.concat(bot ? ["bot"] : [])).join(' '))}${bot ? `&permissions=${config.botPermissions}` : ''}`

const refreshTokenMaxAge = 1000 * 60 * 60 * 24 * 7 * 2; // two weeks
const makeSecureCookieConfig = (secure, maxAge=refreshTokenMaxAge) => { return { httpOnly: true, secure: secure, maxAge: maxAge } }

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
    let fromBrowser = req.query['redirect'] != undefined;
    const redirectURL = req.query['redirect-url'];
    const refreshToken = req.cookies[Cookies.Refresh];
    if (!refreshToken) {
        if (fromBrowser) return res.redirect(config.authUrl);
        else return res.status(401);
    };

    let aT = await getAccessToken(refreshToken);
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

app.get('/api/oauth2/joinserver', async (req, res) => {
    const redirectURL = req.query['redirect-uri']
    const accessToken = req.cookies[Cookies.Access];
    if (!accessToken) return res.send('no access token') && res.status(401);

    const guildId = req.query['guild-id'];
    if (!guildId) return res.status(400);

    try {
        let response = await addUserToGuild(accessToken, guildId.toString(), (await getUserInfo(accessToken)).id);
        res.json(response);
    } catch {
        res.json({ error: 'invalid guild id' })
        res.status(400)
    } finally {
        if (redirectURL) res.redirect(redirectURL.toString());
    }
});

app.get('/api/oauth2/hasauthorized', (req, res) => {
    const refreshToken = req.cookies[Cookies.Refresh];
    const accessToken = req.cookies[Cookies.Access];
    if (!refreshToken) res.status(400);
    else if (!accessToken) res.status(202);
    else res.status(200)
    res.end()
});

app.get('/api/purchases/get', (req, res) => {
    const accessToken = req.cookies[Cookies.Access];
    if (!accessToken) return res.status(401);

});

app.get('/api/oauth2/authurl', (req, res) => {
    let authUrl = GEN_AUTH_URL(req.query['bot']?.toString() == 'true');

    if (req.query['redirect'] == 'true') res.redirect(authUrl)
    else res.send(authUrl)
    res.end()
});

app.get('/api/user/mypfp', async (req, res) => {
    const accessToken = req.cookies[Cookies.Access];
    if (!accessToken) return res.send('no access token') && res.status(401);

    let avatar = getAvatar(accessToken);

    res.type('png')
    res.send(avatar)
});

app.post('/**', async (req, res) => {
    console.log(JSON.stringify(req.body))
});

app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, "/routes/index.html"))
});

app.get('/**', (req, res) => {
    let url = path.join(__dirname, "/routes/", req.url);
    let url_html = path.join(__dirname, "/routes/", req.url + ".html");

    res.type('text/html')
    if (fs.existsSync(url)) {
        let data = fs.readFileSync(url);
        res.send(data.toString());
        res.status(200)
    } else {
        if (fs.existsSync(url_html)) {
            let html = fs.readFileSync(url_html).toString();
            res.type(".html");
            res.send(html);
            res.status(200)
        }
        else {
            let notfound = fs.readFileSync(path.join(__dirname, "/routes/404.html"))
            res.type('.html');
            res.send(notfound);
            res.status(404)
        };
    }

    return;
})

app.listen(config.port, () => console.log('Webserver started on port: ' + config.port));