# Public publication contract

Only a package proposed by `SWARF---Private` may update `generated/`. Public CI validates the package independently and must use GitHub-hosted runners. A publishing GitHub App gets only the minimum ability to create a branch and pull request; it cannot merge or bypass public branch protections.

The public repository never stores an App private key, private-repository token, or any credential capable of reading private source. Do not use submodules, sibling paths, or `pull_request_target` to obtain private content.

To withdraw published material, merge a reviewed removal package from the private publication workflow. Preserve public safety notices and release history as appropriate.
