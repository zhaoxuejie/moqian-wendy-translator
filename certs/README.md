# 本地自签证书说明

这个目录里的证书**只为本机的局域网 HTTPS 服务使用**，不对外、不需要花钱、不需要备案。

> ⚠️ **`ca.key` 是私钥，绝对不能外泄、绝对不能提交到 Git。**
> 拿到它的人可以给你签发任意域名的证书。`.gitignore` 已经忽略整个 `certs/` 目录。

---

## 文件都是干什么的

| 文件 | 说明 |
|---|---|
| `ca.key` | 🔴 **根 CA 私钥**，保密。丢了要重新生成整套 |
| `ca.crt` | 根 CA 证书（公开）。**装到手机的就是这个** |
| `wendy-rootCA.crt` | 同 `ca.crt`，只是改了个好认的名字，给手机用 |
| `wendy-rootCA.cer` | 同上，DER 格式。个别安卓机型只认这个 |
| `wendy.key` | 服务器私钥。nginx 用 |
| `wendy.crt` | 服务器证书。nginx 用 |
| `wendy-fullchain.pem` | 服务器证书 + 根证书，nginx 用这个 |
| `ca.cnf` / `leaf.cnf` | 生成证书用的配置（要改地址就改 `leaf.cnf`） |
| `ca.srl` / `wendy.csr` | 生成过程的中间文件，可以不管 |

## 有效期

| | 起 | 止 |
|---|---|---|
| 服务器证书 `wendy.crt` | 2026-10-11 | **2029-01-13**（825 天）|
| 根证书 `ca.crt` | 2026-10-11 | 2036 年（10 年）|

服务器证书到期后，手机浏览器会报证书错误，届时重新生成即可（根证书不用换，手机也不用重装）。

---

## 手机怎么装根证书

**华为 / 鸿蒙路径**（不同版本菜单名略有差异，找这几个关键词）：

```
设置 → 安全 → 更多安全设置 → 加密和凭据 → 从存储设备安装 → 选「CA 证书」
```

如果找不到，试试这些等价路径：

```
设置 → 生物识别和密码 → 其他安全设置 → 从存储设备安装
设置 → 安全 → 凭据存储 → 从存储设备安装
```

安装时会弹一个警告（「您的数据可能不再私密」之类），点继续。装完系统可能会常驻一条「网络可能受到监控」的通知，这是正常的，别关。

**文件从哪来**：手机浏览器直接打开

```
http://<电脑IP>:5000/wendy-rootCA.crt
```

就能下载（这个文件是公开的根证书，不是私钥，放在这里安全）。下载完在「文件管理」里找到它，再按上面的路径安装。

也可以直接用微信文件传输助手把 `wendy-rootCA.crt` 发给自己。

> 注意：**必须先下载再安装**。用 HTTPS 地址下载是死循环——手机还不信任这个证书，打不开。

---

## 什么时候需要重新生成

| 情况 | 要做什么 |
|---|---|
| **电脑局域网 IP 变了** | 改 `leaf.cnf` 里的 IP，重新生成服务器证书 + 改 `nginx.conf` 的 `server_name` |
| 服务器证书过期（2029-01-13） | 只重新生成服务器证书，根证书不用动 |
| 根私钥 `ca.key` 泄露 | 整套重新生成，**所有手机都要重装根证书** |

## 重新生成的命令

用 Git 自带的 openssl（`D:\Program Files\Git\usr\bin\openssl.exe`），在本目录下执行：

```powershell
$ossl = 'D:\Program Files\Git\usr\bin\openssl.exe'
$env:MSYS_NO_PATHCONV = '1'

# 1) 根 CA（10 年）—— 只在第一次或泄露后执行
& $ossl req -x509 -newkey rsa:2048 -sha256 -nodes -days 3650 `
    -keyout ca.key -out ca.crt -config ca.cnf

# 2) 服务器私钥 + 请求
& $ossl req -newkey rsa:2048 -sha256 -nodes `
    -keyout wendy.key -out wendy.csr -config leaf.cnf

# 3) 用根 CA 签发服务器证书（825 天）
& $ossl x509 -req -in wendy.csr -CA ca.crt -CAkey ca.key -CAcreateserial `
    -out wendy.crt -days 825 -sha256 -extfile leaf.cnf -extensions v3_leaf

# 4) 拼接 nginx 要用的链 + 导出手机用的根证书
cmd /c "type wendy.crt ca.crt > wendy-fullchain.pem"
& $ossl x509 -in ca.crt -outform DER -out wendy-rootCA.cer
Copy-Item ca.crt wendy-rootCA.crt -Force
```

改完执行 `docker compose restart wendy-https` 让 nginx 重新读取。

## 和 Docker 的关联

`docker-compose.yml` 里把根证书挂进了应用容器，让手机能从 HTTP 直接下载：

```yaml
./certs/wendy-rootCA.crt:/app/frontend/wendy-rootCA.crt:ro
```

所以 **`wendy-rootCA.crt` 这个文件必须存在**。如果把 `certs/` 整个删掉，
Docker 会在宿主机上建一个同名的**目录**，容器就会起不来。
删了证书记得先生成回来再 `docker compose up -d`。

出于安全考虑**只挂了 `.crt`**（公开的根证书）。`ca.key` 既没进容器，
也不能通过 HTTP 访问（`http://<IP>:5000/certs/ca.key` 返回 404）。

## 自检

```powershell
# 证书里的地址对不对（SAN 必须包含手机要访问的 IP）
& $ossl x509 -in wendy.crt -noout -dates -ext subjectAltName

# 证书链是否成立
& $ossl verify -CAfile ca.crt wendy.crt
```

> 用 Windows 自带的 `curl.exe` 测试时，记得加 `--ssl-no-revoke`。
> 否则会报 `CERT_TRUST_REVOCATION_STATUS_UNKNOWN` —— 那是 Windows schannel
> 要查证书吊销列表导致的，**不是证书有问题**，浏览器和安卓都不这么做。
