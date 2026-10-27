// We should check how it is used in `parseNDSingle`.
// parseNDSingle has `lines.slice(hi + 1).forEach(l => { const c = l.split(/\t|,/).map(x => x.trim()); if (!c[0] || c[0].startsWith('//')) return; const v = ndNum(c[1]); ... })`
// It doesn't use `d` because it splits by `\t|,`. So it wouldn't have semicolons anyway.
