import { request } from 'undici';
import config from '../../config.json'

export const BASE_API_ROUTE = "https://discord.com/api/v10/";
export const GEN_API_ROUTE = (route: string): string => (BASE_API_ROUTE + route).replace(/(?<!:)\/(?=\/)/g, '');

export async function getRequest(url: string, headers: object = {}) {
    return await ((await request(url, {
        headers: {
            "Content-Type": "application/json",
            ...headers
        }
    })).body.json());
}

export async function makeRequest(data: object, url: string, headers: object = {}, method: 'POST' | 'PUT' = 'POST') {
    return await ((await request(url, {
        method: method,
        body: JSON.stringify(data),
        headers: {
            "Content-Type": "application/json",
            ...headers
        }
    })).body.json());
}

// application/x-www-form-urlencoded
export async function makeURLEncodedRequest(data: object, url: string, headers: object = {}, method: 'POST' | 'PUT' = 'POST') {
    return await ((await request(url, {
        method: method,
        body: new URLSearchParams({ ...data }).toString(),
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            ...headers
        }
    })).body.json());
}



export async function exchangeCode(code: string) {
    let data = {
        "client_id": config.clientId,
        "client_secret": config.clientSecret,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": `http://localhost:53134/api/oauth2/exchange`
    }

    return await makeURLEncodedRequest(data, GEN_API_ROUTE('/oauth2/token'))
}

export async function getAccessToken(refreshToken: string) {
    let data = {
        'client_id': config.clientId,
        'client_secret': config.clientSecret,
        'grant_type': 'refresh_token',
        'refresh_token': refreshToken
    }

    return await makeURLEncodedRequest(data, GEN_API_ROUTE('/oauth2/token'))
}

export async function addUserToGuild(access_token: string, guildId: string, userId: string) {
    return await makeRequest(
        {
            "access_token": access_token
        },
        GEN_API_ROUTE(`/guilds/${guildId}/members/${userId}`),
        {
            "Authorization": `Bot ${config.botToken}`,
        },
        'PUT')
}

export async function getUserInfo(access_token: string) {
    const url = GEN_API_ROUTE(`/users/@me`);
    return await getRequest(url, {
        "Authorization": `Bearer ${access_token}`
    })
}