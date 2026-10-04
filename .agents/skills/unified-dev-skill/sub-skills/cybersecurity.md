# Cybersecurity Sub-skill

> Source: `Anthropic-Cybersecurity-Skills` — 817 cybersecurity skills covering the full security
> lifecycle. Each skill is a structured procedure for a specific security task.
> Standard: [agentskills.io](https://agentskills.io)

---

## Philosophy

> Security is not a feature. It is a gate on every phase of development.

This sub-skill integrates security into every phase of the engineering lifecycle.
It also provides standalone security procedures for offensive, defensive, and governance tasks.

---

## How This Sub-skill Works

With 817 skills, this sub-skill uses **keyword routing** to identify the relevant procedure.
The agent reads the user's request, identifies the security domain and task, and loads
the appropriate skill from `Anthropic-Cybersecurity-Skills/skills/`.

**Skill discovery path:** `/home/ishtiaqkhan/Reuse/Skills/Anthropic-Cybersecurity-Skills/skills/<skill-name>/SKILL.md`

---

## Domain Map

### 🔴 Offensive Security / Red Team
**Trigger words:** pentest, exploit, red team, attack, lateral movement, privilege escalation, phishing

Key skills:
- `performing-web-application-penetration-test`
- `performing-external-network-penetration-test`
- `performing-kubernetes-penetration-testing`
- `performing-privilege-escalation-on-linux`
- `performing-lateral-movement-with-wmiexec`
- `performing-kerberoasting-attack`
- `performing-red-team-with-covenant`
- `performing-red-team-phishing-with-gophish`
- `performing-phishing-simulation-with-gophish`
- `performing-jwt-none-algorithm-attack`
- `performing-ssrf-vulnerability-exploitation`
- `performing-purple-team-exercise`
- `performing-purple-team-atomic-testing`

### 🔵 Defensive Security / Blue Team
**Trigger words:** SIEM, detect, alert, SOC, incident, triage, monitor, threat hunt

Key skills:
- `triaging-security-incident`
- `triaging-security-incident-with-ir-playbook`
- `triaging-security-alerts-in-splunk`
- `performing-threat-hunting-with-elastic-siem`
- `performing-threat-hunting-with-yara-rules`
- `performing-user-behavior-analytics`
- `performing-lateral-movement-detection`
- `performing-false-positive-reduction-in-siem`
- `performing-log-source-onboarding-in-siem`
- `performing-ioc-enrichment-automation`

### 🟢 Digital Forensics & Incident Response (DFIR)
**Trigger words:** forensics, memory dump, disk image, timeline, artifact, volatility, autopsy

Key skills:
- `performing-memory-forensics-with-volatility3`
- `performing-endpoint-forensics-investigation`
- `performing-linux-log-forensics-investigation`
- `performing-network-forensics-with-wireshark`
- `performing-log-analysis-for-forensic-investigation`
- `performing-timeline-reconstruction-with-plaso`
- `recovering-deleted-files-with-photorec`
- `performing-malware-triage-with-yara`
- `performing-static-malware-analysis-with-pe-studio`
- `performing-memory-forensics-with-volatility3-plugins`

### 🟡 Malware Analysis & Reverse Engineering
**Trigger words:** malware, reverse engineer, binary, decompile, ghidra, jadx, ransomware

Key skills:
- `reverse-engineering-malware-with-ghidra`
- `reverse-engineering-android-malware-with-jadx`
- `reverse-engineering-dotnet-malware-with-dnspy`
- `reverse-engineering-ransomware-encryption-routine`
- `performing-malware-ioc-extraction`
- `performing-malware-persistence-investigation`
- `performing-dynamic-analysis-with-any-run`
- `performing-firmware-malware-analysis`

### 🟣 Cloud Security
**Trigger words:** AWS, Azure, GCP, cloud, IAM, S3, Lambda, Kubernetes, container

Key skills:
- `securing-aws-iam-permissions`
- `securing-aws-lambda-execution-roles`
- `securing-azure-with-microsoft-defender`
- `securing-kubernetes-on-cloud`
- `performing-kubernetes-penetration-testing`
- `performing-gcp-penetration-testing-with-gcpbucketbrute`
- `scanning-containers-with-trivy-in-cicd`
- `scanning-docker-images-with-trivy`
- `scanning-kubernetes-manifests-with-kubesec`
- `securing-github-actions-workflows`
- `securing-serverless-functions`
- `remediating-s3-bucket-misconfiguration`

### 🔶 Application Security (AppSec)
**Trigger words:** XSS, SQL injection, OWASP, API security, JWT, OAuth, CORS, SSRF

Key skills:
- `testing-for-xss-vulnerabilities`
- `testing-api-security-with-owasp-top-10`
- `testing-for-broken-access-control`
- `testing-for-json-web-token-vulnerabilities`
- `testing-oauth2-implementation-flaws`
- `testing-cors-misconfiguration`
- `testing-for-xxe-injection-vulnerabilities`
- `performing-second-order-sql-injection`
- `performing-graphql-security-assessment`
- `testing-for-business-logic-vulnerabilities`
- `performing-security-headers-audit`
- `performing-sca-dependency-scanning-with-snyk`

### ⚫ AI/LLM Security
**Trigger words:** prompt injection, LLM, RAG, AI security, system prompt, agentic

Key skills:
- `testing-for-system-prompt-leakage`
- `testing-prompt-injection-in-rag-pipelines`
- `red-teaming-llms-with-garak`
- `securing-agentic-ai-tool-invocation`

### 🔸 Vulnerability Management
**Trigger words:** CVE, CVSS, vulnerability scan, Nessus, patch, remediation

Key skills:
- `performing-vulnerability-scanning-with-nessus`
- `prioritizing-vulnerabilities-with-cvss-scoring`
- `triaging-vulnerabilities-with-ssvc-framework`
- `performing-endpoint-vulnerability-remediation`
- `scanning-infrastructure-with-nessus`

### 🏛️ Governance, Risk & Compliance (GRC)
**Trigger words:** compliance, audit, SOC2, NIST, ISO 27001, risk, policy

Key skills:
- `performing-soc2-type2-audit-preparation`
- `performing-nist-csf-maturity-assessment`
- `performing-privacy-impact-assessment`
- `performing-ransomware-tabletop-exercise`
- `performing-soc-tabletop-exercise`

---

## Security Gates in the Engineering Lifecycle

### During `/spec`
- Define the threat model: Who are the adversaries? What are the assets?
- Identify compliance requirements (GDPR, SOC2, HIPAA, etc.)
- Mark security-sensitive modules in the capability map

### During `/plan`
- Security tasks are first-class tasks, not afterthoughts
- Auth, authz, input validation are planned in the identity/core modules
- Dependency audit scheduled before first build task

### During `/build`
**Mandatory security checklist per task:**
- [ ] All inputs validated and sanitized
- [ ] No secrets hardcoded (use env vars / secrets manager)
- [ ] Auth and authz checks on every protected operation
- [ ] Errors caught and logged without leaking sensitive data
- [ ] Dependencies added? Run `npm audit` / `pip-audit` / `grype`

### During `/review` (Security Axis)
- [ ] SQL injection possible? (parameterized queries always)
- [ ] XSS possible? (output encoding, CSP headers)
- [ ] SSRF possible? (validate URLs, restrict egress)
- [ ] Broken access control? (verify every route, not just UI)
- [ ] Sensitive data in logs or errors?
- [ ] JWT/session tokens properly validated and expired?
- [ ] CORS misconfigured? (no `*` on credentialed requests)
- [ ] Rate limiting on auth endpoints?

### During `/ship`
- Run `performing-security-headers-audit` on all exposed endpoints
- Run dependency scanner: `scanning-iac-and-images-with-trivy`
- Verify secrets rotation is complete
- Confirm monitoring is alerting on auth failures and anomalies

---

## Skill Loading Protocol

When a security task is identified:

1. **Map request to domain** using the domain map above
2. **Identify the specific skill** by name
3. **Load skill from source:**
   ```
   /home/ishtiaqkhan/Reuse/Skills/Anthropic-Cybersecurity-Skills/skills/<skill-name>/SKILL.md
   ```
4. **Follow the skill procedure exactly** — no improvising, no placeholders
5. **Reference real CVEs, tools, and framework IDs** — never fabricate

> ⚠️ Scripts must run. No invented API endpoints, no fabricated CVE numbers.
> Framework IDs (MITRE ATT&CK, CWE, CVE) must be real and current.
> Omit rather than guess.
