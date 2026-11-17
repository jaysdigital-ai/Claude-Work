"""Add ?v=<content hash> to /assets/*.css|js links in redesign pages so browsers fetch new versions."""
import hashlib, os, re, sys
root = sys.argv[1]
names = [f for f in os.listdir(os.path.join(root, "assets")) if f.endswith((".css", ".js"))]
h = {f: hashlib.md5(open(os.path.join(root, "assets", f), "rb").read()).hexdigest()[:10] for f in names}
h["vendor/three-r128.min.js"] = "r128"
pat = re.compile(r'((?:\.\./)*assets/(%s))(\?v=[\w]+)?(?=["\'])' % "|".join(re.escape(k) for k in h))
n = 0
for dp, dn, fn in os.walk(root):
    dn[:] = [d for d in dn if not d.startswith("demo-") and d not in ("functions", "server")]
    for f in fn:
        if f.endswith(".html"):
            p = os.path.join(dp, f); s = open(p).read()
            t = pat.sub(lambda m: m.group(1) + "?v=" + h[m.group(2)], s)
            if t != s: open(p, "w").write(t); n += 1
print("stamped", n, "pages")
