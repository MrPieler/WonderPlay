import { copyFileSync } from 'node:fs'

// Cloudflare Pages' `_redirects` validator false-flags a fallback rule whose destination is
// literally `/index.html` as an infinite loop (cloudflare/workers-sdk#11824), even though the
// 200 rewrite it's rejecting is safe. Serving the identical content from a differently-named
// file sidesteps the buggy check.
copyFileSync('dist/index.html', 'dist/200.html')
