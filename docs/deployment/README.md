# Preview 验收与 Production 记录

两个 JSON 文件是机器可检查的事实记录，不得包含密码、API key、cookie、token 或其他 secret。

## Preview 验收

向 `preview-acceptance.json` 的 `acceptances` 数组增加对象：

```json
{
  "feature": "fix/example",
  "previewUrl": "https://example.vercel.app",
  "branch": "fix/example",
  "previewCommitSha": "40-character SHA",
  "productionCandidateSha": "merged main 40-character SHA",
  "baseSha": "comparison base 40-character SHA",
  "acceptedAt": "ISO-8601 timestamp",
  "status": "accepted",
  "desktop": "pass",
  "tablet": "pass",
  "mobile": "pass",
  "coreRoutes": "pass",
  "signIn": "pass",
  "aiSearch": "pass",
  "rentalCase": "pass",
  "map": "pass",
  "contentIntegrity": "pass",
  "performance": "pass",
  "knownIssues": [],
  "acceptedBy": "user identifier or role",
  "approvedForMain": true,
  "databaseMigrationIncluded": false,
  "environmentVariableChangeRequired": false
}
```

`productionCandidateSha` 必须与准备发布的 `main` HEAD 完全一致。merge 后 SHA 改变时，需要把验收结果明确关联到新 main SHA，不能凭聊天记忆推断。

## Production 部署记录

部署完成后向 `production-deployments.json` 增加对象，至少包含 deployment ID、时间、repository、worktree、branch、commit SHA、Vercel project、Preview URL、用户授权记录、migration/环境变量状态、部署后回归结果和回滚目标 deployment。禁止记录 secret 值。
