# SonarQube 導入ガイド

本リポジトリでの導入実例と、想定される他構成（GitLab セルフホスト / Rancher Desktop でローカルCI）への適用パターンをまとめる。

---

## 1. 製品の選択肢と用語整理

| 製品名 | 形態 | コスト | 主な用途 |
|---|---|---|---|
| **SonarQube Cloud**（旧 SonarCloud） | SaaS | **Public 無料** / Private 有料 | OSS・個人 / 小規模商用 |
| **SonarQube Server**（旧 SonarQube） Community Edition | セルフホスト | 無料（OSS） | 社内・要オンプレ |
| Server Developer/Enterprise | セルフホスト | 有料 | branch/PR 分析・大規模 |

**Scanner**（解析エンジン）はどの形態でも同じ。**設定ファイル `sonar-project.properties` と CI 連携の作法もほぼ共通**なので、SaaS で学んだ手順がセルフホストに転用できる。

3つの登場物の関係:
```
[ Source / Tests / Coverage ]
        │
        ▼ scanner（CLI or GH Actions / GitLab CI 経由）
[ SonarQube Cloud or Server ]
        │
        ▼ ダッシュボード・Quality Gate・PR コメント
[ 開発者へフィードバック ]
```

---

## 2. パターン A: GitHub + SonarQube Cloud（本リポジトリの構成）

### 構成
```
GitHub  ──push/PR──▶  GitHub Actions  ──scan──▶  SonarQube Cloud
                              │                          │
                              ▼                          ▼
                       lcov.info 添付              PR コメント
```

### 前提
- Public GitHub リポジトリ（Private なら Cloud 有料 or Server へ）
- pnpm/npm/yarn のいずれか + テスト + カバレッジ生成

### セットアップ手順

#### Step 1. SonarQube Cloud 側
1. https://sonarcloud.io に GitHub アカウントでサインアップ
2. **「Create new Organization」→「Import from GitHub」** で GitHub App を当該リポジトリへインストール
3. **「Analyze new project」** → 対象リポジトリ選択 → 「**With GitHub Actions**」を選ぶ（Automatic ではない）
4. 表示される **`SONAR_TOKEN` / `projectKey` / `organization`** を控える

#### Step 2. リポジトリ側（コード）

`sonar-project.properties`:
```properties
sonar.projectKey=YOUR_PROJECT_KEY
sonar.organization=YOUR_ORG_KEY
sonar.projectName=baseball-score-app
sonar.sources=src
sonar.tests=src
sonar.test.inclusions=src/**/*.test.ts
sonar.exclusions=**/node_modules/**,**/.next/**,**/dist/**,**/build/**,**/coverage/**,**/*.d.ts
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.typescript.tsconfigPath=tsconfig.json
```

`.github/workflows/sonarqube.yml`:
```yaml
name: SonarQube
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  sonarqube:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:coverage
      - uses: SonarSource/sonarqube-scan-action@7006c4492b2e0ee0f816d36501671557c97f5995 # v8.1.0
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: https://sonarcloud.io
```

`package.json`:
```json
"packageManager": "pnpm@11.1.3",
"scripts": {
  "test:coverage": "vitest run --coverage"
}
```

#### Step 3. GitHub Secrets
- Settings → Secrets and variables → Actions → **`SONAR_TOKEN`** に Step 1 のトークンを登録

#### Step 4. 動作確認
- 何かを main に push、もしくは PR を出す
- Actions が緑になり、Cloud ダッシュボードにメトリクスが出れば成功

### Cloud 側でハマりやすい点
- **Automatic Analysis と CI Analysis を同時に有効にすると競合**して `EXECUTION FAILURE`。CI 派なら Project Administration → Analysis Method で Automatic を OFF
- `fetch-depth: 0` 必須（PR 差分解析のため）
- pnpm の Node 要件: pnpm 11+ は Node ≥22.13

### Public API での読み取り（補助）
Public プロジェクトなら **認証なしで API が叩ける**。Private は User Token を `Authorization: Bearer ...` で:
```bash
# Quality Gate
curl https://sonarcloud.io/api/qualitygates/project_status?projectKey=KEY
# 未解決 Bug
curl https://sonarcloud.io/api/issues/search?componentKeys=KEY&types=BUG&resolved=false
# Security Hotspot
curl https://sonarcloud.io/api/hotspots/search?projectKey=KEY&status=TO_REVIEW
```

---

## 3. パターン B: GitLab セルフホスト + SonarQube Server（社内想定）

### 構成
```
GitLab (Self-hosted)  ──push/MR──▶  GitLab CI Runner  ──scan──▶  SonarQube Server (Self-hosted)
                                            │                            │
                                            ▼                            ▼
                                     ジョブ実行・成果物              MR Widget / コメント
```

GitLab と SonarQube は**別サーバー**でもいいし、同じ K8s に同居でも可。OAuth/SSO 連携を組むと SonarQube に GitLab アカウントでログインできる。

### A. SonarQube Server を起動
最小構成（PoC・開発用）。本番は Postgres を外部にし永続化を強化。

`docker-compose.yml`:
```yaml
services:
  sonarqube:
    image: sonarqube:community
    ports: ["9000:9000"]
    environment:
      SONAR_JDBC_URL: jdbc:postgresql://db:5432/sonar
      SONAR_JDBC_USERNAME: sonar
      SONAR_JDBC_PASSWORD: sonar
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_logs:/opt/sonarqube/logs
      - sonarqube_extensions:/opt/sonarqube/extensions
    depends_on: [db]
    ulimits:
      nofile: { soft: 65536, hard: 65536 }
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: sonar
      POSTGRES_PASSWORD: sonar
      POSTGRES_DB: sonar
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  sonarqube_data:
  sonarqube_logs:
  sonarqube_extensions:
  postgres_data:
```

```bash
docker compose up -d
# ホストのカーネル設定（Linux）
sudo sysctl -w vm.max_map_count=524288
```
- 初回起動後 `http://localhost:9000` を開き、`admin/admin` でログイン → パスワード変更
- Administration → Marketplace で必要言語プラグインを確認（TypeScript はバンドル済）

### B. GitLab CI 側

`.gitlab-ci.yml`（GitHub Actions 相当）:
```yaml
stages: [test, sonarqube]

variables:
  SONAR_USER_HOME: "${CI_PROJECT_DIR}/.sonar"
  GIT_DEPTH: "0"   # 差分解析のため shallow clone を解除

test:
  stage: test
  image: node:22
  before_script:
    - corepack enable
    - corepack prepare pnpm@11.1.3 --activate
  script:
    - pnpm install --frozen-lockfile
    - pnpm test:coverage
  artifacts:
    paths:
      - coverage/
    expire_in: 1 hour

sonarqube:
  stage: sonarqube
  image:
    name: sonarsource/sonar-scanner-cli:latest
    entrypoint: [""]
  cache:
    key: "${CI_JOB_NAME}"
    paths: [".sonar/cache"]
  script:
    - sonar-scanner
  variables:
    SONAR_HOST_URL: "https://sonarqube.your-company.com"
    SONAR_TOKEN: "${SONAR_TOKEN}"   # GitLab CI 変数で設定
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
```

`sonar-project.properties`（Cloud 版から `sonar.organization` を抜くだけ）:
```properties
sonar.projectKey=baseball-score-app
sonar.projectName=baseball-score-app
sonar.sources=src
sonar.tests=src
sonar.test.inclusions=src/**/*.test.ts
sonar.exclusions=**/node_modules/**,**/.next/**,**/dist/**,**/build/**,**/coverage/**,**/*.d.ts
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.typescript.tsconfigPath=tsconfig.json
```

### C. GitLab CI 変数の登録
- GitLab プロジェクト → Settings → CI/CD → Variables
- **`SONAR_TOKEN`**（Masked + Protected 推奨）に SonarQube Server で発行したトークン

### D. Merge Request 連携
SonarQube Server 側（Administration → DevOps Platform Integrations → GitLab）で GitLab トークン登録。プロジェクトの **General Settings → DevOps Platform Integration** で当該 GitLab プロジェクトを紐付け → MR で SonarQube のチェックがウィジェットに出る。

### Cloud → Server の移植チェックリスト
| 項目 | Cloud | Server |
|---|---|---|
| `sonar.organization` | 必要 | 不要（削除） |
| `SONAR_HOST_URL` | `https://sonarcloud.io` | `https://sonarqube.your-company.com` |
| `SONAR_TOKEN` | Cloud UI で発行 | Server UI で発行 |
| OAuth 連携 | 自動（GitHub） | GitLab/GitHub いずれも手動設定 |

---

## 4. パターン C: Rancher Desktop でローカル / オンプレ CI

「**社外SaaSに依存せず、開発者の手元 or 社内 K8s で完結させたい**」場合の構成。Rancher Desktop は手元 Mac/Windows に K8s + Docker を提供するため、社内ネットワーク隔離下のPoCに適する。

### C-1. 最小: sonar-scanner-cli をローカル Docker で回す（CI 不要）

GitLab/GitHub なしで個人開発者が手元で解析だけ回す形:

```bash
# 事前にカバレッジを生成
pnpm test:coverage

# Sonar Scanner CLI をコンテナで実行（Rancher Desktop の Docker でOK）
docker run --rm \
  -v "$(pwd)":/usr/src \
  -e SONAR_HOST_URL="http://host.lima.internal:9000" \
  -e SONAR_TOKEN="$SONAR_TOKEN" \
  sonarsource/sonar-scanner-cli:latest
```
- `host.lima.internal` は Rancher Desktop が提供するホスト名（Lima ベース）。SonarQube Server もローカルで起動している前提
- SonarQube Server を K8s で動かすなら Service の ClusterIP/Ingress URL に差し替え

### C-2. SonarQube Server を Rancher Desktop の K8s にデプロイ

Helm を使うのが手軽:
```bash
helm repo add sonarqube https://SonarSource.github.io/helm-chart-sonarqube
helm repo update

# Postgres 同梱で起動（PoC 用。永続化はデフォルト PVC）
helm install sonarqube sonarqube/sonarqube \
  --namespace sonarqube --create-namespace \
  --set monitoringPasscode="ChangeMe!" \
  --set postgresql.enabled=true

# Service の URL を確認
kubectl -n sonarqube get svc
```
- Rancher Desktop なら `traefik` で ingress を作成、もしくは `kubectl port-forward svc/sonarqube-sonarqube 9000:9000`
- 初回ログイン admin/admin → パスワード変更 → token 発行

### C-3. GitLab Runner を Rancher Desktop に立てて GitLab CI を社内で回す

社内 GitLab（オンプレ or SaaS）から jobs を pick して、**実行は手元 or 社内 K8s** という構成。SonarQube も同じクラスタに同居できる。

```bash
helm repo add gitlab https://charts.gitlab.io
helm repo update

# Runner Registration Token は GitLab の Project/Group Settings → CI/CD → Runners から取得
helm install gitlab-runner gitlab/gitlab-runner \
  --namespace gitlab-runner --create-namespace \
  --set gitlabUrl=https://gitlab.your-company.com/ \
  --set runnerRegistrationToken=YOUR_TOKEN \
  --set rbac.create=true
```
- Runner が K8s 内で job pod を起動する形態（kubernetes executor）になり、`.gitlab-ci.yml` の `image:` フィールドで指定したコンテナが立ち上がって job を実行
- 上述パターンB の `.gitlab-ci.yml` がそのまま動く（runner 設定は GitLab UI でデフォルトに）

### C-4. 開発フロー
```
[ Dev Workstation ]
  ├ ソース編集 / SonarLint で即時フィードバック
  └ git push
        │
        ▼
[ Social GitLab Server ] ──jobs──▶ [ Rancher Desktop K8s ]
                                       ├ GitLab Runner Pod
                                       ├ Test ジョブ pod（Node 22）
                                       └ Sonar Scan ジョブ pod
                                              │
                                              ▼
                                       [ SonarQube Server Pod ]
```

### C-5. Rancher Desktop 特有の注意
- メモリ: SonarQube + Postgres + Runner で **最低 8GB**、できれば 12GB Rancher Desktop に割り当て
- `vm.max_map_count` を上げる必要がある（Rancher Desktop は内部 VM で動くので `rdctl shell` 経由で sysctl）:
  ```bash
  rdctl shell sudo sysctl -w vm.max_map_count=524288
  ```
- パフォーマンスは社内サーバ実機に劣るので**本格運用ではなくPoC・個人検証用**

---

## 5. 横串の運用ノート

### Quality Gate の運用
- 既定の **「Sonar way」** で十分。初期は **PR ブロックはせず警告のみ**
- 慣れたらブランチ保護の **Required status check** に SonarQube を追加して必須化
- カスタムGate（新規コードのみ厳しく・既存コードは現状維持）が現実的

### False Positive の扱い
SonarQube が出す指摘の中には現場のコンテキストで「対応不要」のものもある。3通りで処理:
1. **コードを直す**（推奨。今回の Math.random 撤去はこれ）
2. **Issue 単位で "Mark as safe / Won't fix"**（SonarQube UI で）
3. **Source 注釈で抑制**（`// NOSONAR` コメント等）

ルール: コメントで黙らせるより、**安全な書き換え or 設定での除外**を優先。

### カバレッジの分母
- 言語ごとに `sonar.*.lcov.reportPaths` 等のパスを設定
- `sonar.coverage.exclusions` で **テスト不要なファイル**（UI page.tsx / route.ts / type 定義など）を除外して**実質測定対象の母数**を絞ると現実的な数字になる
- 本リポジトリの `sonar-project.properties` を参照

### 認証トークンの管理
- GitHub Actions / GitLab CI Variables に **Masked / Protected** で登録
- ローテーション: 半年〜1年で更新推奨
- 開発者個人のトークンと CI 用トークンは**別アカウント（service account）**で発行するのが大規模化したときの正解

### バージョン管理（Server 自己ホスト時）
- SonarQube Server は LTS / Active / 旧 LTS の3系統あり、**LTS を選ぶ**のが運用上楽
- データベースを伴うので、アップグレード前に **dump 必須**
- プラグインの互換性に注意

---

## 6. 関連リポジトリのファイル

| ファイル | 役割 |
|---|---|
| [sonar-project.properties](../sonar-project.properties) | scanner 設定（解析対象・カバレッジパス） |
| [.github/workflows/sonarqube.yml](../.github/workflows/sonarqube.yml) | GitHub Actions ジョブ |
| [vitest.config.ts](../vitest.config.ts) | `coverage` セクション（lcov 出力） |
| [package.json](../package.json) | `test:coverage` スクリプト、`packageManager` |

## 7. 参考リンク
- SonarQube 公式ドキュメント: https://docs.sonarsource.com/
- Scanner CLI: https://docs.sonarsource.com/sonarqube-server/latest/analyzing-source-code/scanners/sonarscanner/
- TypeScript / JavaScript ルール一覧: https://rules.sonarsource.com/javascript/
- Helm Chart: https://github.com/SonarSource/helm-chart-sonarqube
