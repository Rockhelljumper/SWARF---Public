# Security policy

Report vulnerabilities privately to the repository owner. Do not include credentials, private material, or exploit details in public issues.

Generated content is treated as untrusted until public CI validates package digests, file digests, paths, and basic secret/privacy markers. Public contributor code runs only on GitHub-hosted runners. Never use `pull_request_target` to check out or execute untrusted code.
