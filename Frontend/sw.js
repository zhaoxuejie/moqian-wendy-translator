/**
 * 温蒂翻译助手 —— Service Worker
 *
 * 作用：
 *   1. 让应用可以"安装"到手机桌面，全屏运行、没有浏览器地址栏
 *   2. 断网时仍能打开界面、查看上次同步下来的单词本/进度（离线兜底）
 *   3. 把 Font Awesome 的 CDN 资源也缓存下来，断网时图标不会变成方框
 *
 * 缓存策略：
 *   - 页面导航          → 网络优先，断网回退到缓存的首页
 *   - 同源静态资源      → 网络优先，断网回退到缓存
 *   - 后端 /api/ 接口   → 网络优先，断网回退到上次成功的响应（只缓存 GET）
 *   - 跨域资源（CDN）   → 缓存优先 + 后台更新
 *
 * 重要：写操作（POST/PUT/DELETE）一律直接走网络，绝不缓存，
 *       避免"看起来保存成功了、其实只改了缓存"这种危险情况。
 *
 * ⚠️ Service Worker 只能在安全上下文注册：
 *      https://... 或 http://localhost 可以；
 *      纯 HTTP 的局域网地址（http://192.168.x.x:5000）会被浏览器拒绝。
 *
 * 维护提示：改动前端文件后，把下面的 SW_VERSION 加一，
 *          旧的缓存会在 activate 阶段被自动清掉。
 */

const SW_VERSION = 'v7';
const SHELL_CACHE = `wendy-shell-${SW_VERSION}`;
const RUNTIME_CACHE = `wendy-runtime-${SW_VERSION}`;
const API_CACHE = `wendy-api-${SW_VERSION}`;
const KEEP_CACHES = [SHELL_CACHE, RUNTIME_CACHE, API_CACHE];

// 应用外壳：安装时预缓存，保证首次离线也能打开
const SHELL_ASSETS = [
    './',
    './index.html',
    './style.css',
    './api.js',
    './site.webmanifest',
    './favicon.svg',
    './favicon.ico',
    './icon-32.png',
    './icon-180.png',
    './icon-192.png',
    './icon-512.png',
    './img/duola.jpg',
    './img/kenan.jpg',
    './img/xiaowanzi.jpg',
    './games/game-kit.css',
    './games/game-kit.js',
    './games/word-challenge/word-challenge.css',
    './games/word-challenge/word-challenge.js',
    './games/time-challenge/time-challenge.css',
    './games/time-challenge/time-challenge.js',
    './games/combo-rewards/combo-rewards.css',
    './games/combo-rewards/combo-rewards.js',
    './games/ai-battle/ai-battle.css',
    './games/ai-battle/ai-battle.js',
    './games/word-blitz/word-blitz.css',
    './games/word-blitz/word-blitz.js',
    './games/word-match/word-match.css',
    './games/word-match/word-match.js',
    './games/word-hunter/word-hunter.css',
    './games/word-hunter/word-hunter.js',
    './games/lexipuzzle/lexipuzzle.css',
    './games/lexipuzzle/lexipuzzle.js',
    './games/adventure/adventure.css',
    './games/adventure/adventure.js'
];

// ==================== 安装 ====================
self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(SHELL_CACHE);

        // 逐个缓存：任何一个失败都不阻断安装（否则一个 404 会让整个 PWA 装不上）
        const results = await Promise.allSettled(
            SHELL_ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' })))
        );
        const failed = SHELL_ASSETS.filter((_, i) => results[i].status === 'rejected');
        if (failed.length) {
            console.warn('[SW] 以下资源预缓存失败（不影响使用）：', failed);
        }

        await self.skipWaiting();
    })());
});

// ==================== 激活 ====================
self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(
            names.map((name) => (KEEP_CACHES.indexOf(name) === -1 ? caches.delete(name) : null))
        );
        await self.clients.claim();
        console.log('[SW] 已激活，缓存版本：', SW_VERSION);
    })());
});

// ==================== 请求拦截 ====================
self.addEventListener('fetch', (event) => {
    const req = event.request;

    // 写操作一律直连网络，绝不缓存
    if (req.method !== 'GET') return;

    let url;
    try {
        url = new URL(req.url);
    } catch (e) {
        return;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    // 媒体请求（单词的真人发音 mp3）直接放行，不介入：
    //   1. 音频常用 Range 请求，返回 206 部分内容，而 Cache API 不接受 206 响应
    //   2. 这些文件数量多、体积大，缓存在 Cache Storage 里会无限增长
    // 交给浏览器自己的 HTTP 缓存更合适。
    if (req.destination === 'audio' || req.destination === 'video') return;

    // 同源：页面导航 + 静态资源 + 后端接口 —— 都是网络优先
    if (url.origin === self.location.origin) {
        if (url.pathname.indexOf('/api/') === 0) {
            // 接口：断网时回退到上次成功的响应，让离线也能看到数据
            event.respondWith(networkFirst(req, API_CACHE, null, true));
        } else if (req.mode === 'navigate') {
            // 页面导航：断网时回退到缓存的首页
            event.respondWith(networkFirst(req, RUNTIME_CACHE, SHELL_ASSETS[1], true));
        } else {
            // 静态资源：网络优先（保证代码永远是最新的），断网回退缓存
            event.respondWith(networkFirst(req, RUNTIME_CACHE, null, false));
        }
        return;
    }

    // 跨域（Font Awesome CDN 等）：缓存优先 + 后台静默更新
    event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
});

// ==================== 策略实现 ====================

/**
 * 跨缓存查找。
 * 为什么需要：首次访问时 SW 还在安装，并没有接管页面，所以那一刻的
 * style.css / api.js 等请求根本没经过 fetch 事件，运行时缓存是空的，
 * 只有 install 阶段预缓存进 SHELL_CACHE 的那一份。
 * 如果断网回退只查运行时缓存，样式和脚本就会全部加载失败 ——
 * 表现为"页面能打开，但完全没样式"。
 */
async function matchFromAnyCache(req, opts) {
    const names = [RUNTIME_CACHE, SHELL_CACHE, API_CACHE];
    for (let i = 0; i < names.length; i++) {
        const cache = await caches.open(names[i]);
        const hit = await cache.match(req, opts);
        if (hit) return hit;
    }
    return null;
}

/**
 * 网络优先：在线时永远拿最新内容并顺手更新缓存；断网时用缓存兜底。
 * @param {Request} req
 * @param {string} cacheName
 * @param {string|null} fallbackUrl 断网且无缓存时，额外尝试的兜底资源（如首页）
 * @param {boolean} exactMatch 接口请求必须精确匹配，避免把别的查询参数当命中
 */
/**
 * 判断是不是"后端挂了"的网关错误。
 *
 * 为什么必须判断：前面挂了 nginx 之后，后端容器停掉时浏览器收到的
 * 不是"网络错误"，而是 nginx 返回的一个正常的 502/503/504 响应。
 * fetch() 不会抛异常，如果不特意识别，就会把这个错误页当成正常结果
 * 返回给页面 —— 缓存里明明有数据却完全用不上，离线能力形同虚设。
 */
function isUpstreamDown(status) {
    return status === 502 || status === 503 || status === 504;
}

async function networkFirst(req, cacheName, fallbackUrl, exactMatch) {
    const cache = await caches.open(cacheName);

    let response = null;
    try {
        response = await fetch(req);
    } catch (err) {
        response = null; // 网络层直接失败：断网、连接被拒、DNS 失败
    }

    if (response) {
        // 成功响应顺手更新缓存
        if (response.status === 200 && response.type !== 'opaque') {
            cache.put(req, response.clone());
        }
        // 正常响应直接返回；网关错误则往下走离线回退
        if (!isUpstreamDown(response.status)) {
            return response;
        }
    }

    // ===== 离线回退 =====
    // 先查本缓存，再翻遍所有缓存（首次访问时资源只在预缓存里，见 matchFromAnyCache）
    const matchOpts = { ignoreSearch: !exactMatch };
    const cached = (await cache.match(req, matchOpts)) || (await matchFromAnyCache(req, matchOpts));
    if (cached) return cached;

    if (fallbackUrl) {
        const shell = await caches.open(SHELL_CACHE);
        const page = await shell.match(fallbackUrl);
        if (page) return page;
    }

    // 实在没有缓存可回退，就把真实错误原样返回，别掩盖问题
    if (response) return response;

    // 接口请求：返回结构化错误，前端已有的错误提示会正常显示
    if (req.url.indexOf('/api/') !== -1) {
        return new Response(
            JSON.stringify({
                success: false,
                offline: true,
                error: '当前处于离线状态，无法获取最新数据'
            }),
            { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
        );
    }

    return new Response('', { status: 504, statusText: 'Offline' });
}

/**
 * 缓存优先 + 后台更新：先给缓存（秒开），同时偷偷拉一次新的存起来。
 * 用于 CDN 上的第三方资源，跨域拿不到状态码，只能这么处理。
 */
async function staleWhileRevalidate(req, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(req);

    const networkPromise = fetch(req)
        .then((res) => {
            // opaque 是跨域无 CORS 响应，拿不到状态码，一律缓存
            if (res && (res.status === 200 || res.type === 'opaque')) {
                cache.put(req, res.clone());
            }
            return res;
        })
        .catch(() => null);

    if (cached) return cached;

    const fresh = await networkPromise;
    if (fresh) return fresh;
    return new Response('', { status: 504, statusText: 'Offline' });
}

// ==================== 消息 ====================
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
