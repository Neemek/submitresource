import { Dispatcher, request } from 'undici';
import BodyReadable from 'undici/types/readable';
import config from '../../config.json'

export const BASE_API_ROUTE = "https://discord.com/api/v10/";
export const GEN_API_ROUTE = (route: string): string => (BASE_API_ROUTE + route).replace(/(?<!:)\/(?=\/)/g, '');

export async function getRequest(url: string, headers: object = {}): Promise<Dispatcher.ResponseData> {
    return (await request(url, {
        headers: {
            "Content-Type": "application/json",
            ...headers
        }
    }));
}

export async function makeRequest(data: object, url: string, headers: object = {}, method: 'POST' | 'PUT' = 'POST'): Promise<any> {
    try {
        return await ((await request(url, {
            method: method,
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json",
                ...headers
            }
        })).body.json());
    } catch {
        console.log('oops')
    }
}

// application/x-www-form-urlencoded
export async function makeURLEncodedRequest(data: object, url: string, headers: object = {}, method: 'POST' | 'PUT' = 'POST'): Promise<any> {
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

export async function refreshTokens(refreshToken: string) {
    let data = {
        'client_id': config.clientId,
        'client_secret': config.clientSecret,
        'grant_type': 'refresh_token',
        'refresh_token': refreshToken
    }

    return await makeURLEncodedRequest(data, GEN_API_ROUTE('/oauth2/token'))
}

interface UserInfo {
    id: string,
    username: string,
    discriminator: string,
    avatar: string,
    verified: boolean,
    email: string,
    flags: number,
    banner: string,
    accent_color: number,
    premium_type: number,
    public_flags: number
}

const UserCache = new Map();

export async function getUserInfo(access_token: string): Promise<UserInfo> {
    if (!UserCache.has(access_token)) {
        const url = GEN_API_ROUTE(`/users/@me`);

        let data: UserInfo = await (await getRequest(url, {
            "Authorization": `Bearer ${access_token}`
        })).body.json() as UserInfo;

        UserCache.set(access_token, data)
        setTimeout(() => UserCache.delete(access_token), 1000 * 60 * 2.5)
        return data;
    } else {
        return UserCache.get(access_token);
    }
}

interface GuildPartial {
    id: string,
    name: string,
    icon: string,
    owner: boolean,
    permissions: string,
    features: string[]
}

export async function isInGuild(access_token: string, guildId: string) {
    let data: GuildPartial[] = await (await getRequest(GEN_API_ROUTE('/users/@me/guilds'), {
        "Authorization": `Bearer ${access_token}`
    })).body.json() as GuildPartial[]

    return data.some(part => part.id === guildId)
}