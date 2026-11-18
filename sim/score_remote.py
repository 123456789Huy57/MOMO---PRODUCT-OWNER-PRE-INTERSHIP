"""Score results of the deployed /api/ai/parse endpoint (Gemini with rules fallback).
Usage: python3 sim/score_remote.py results.json   (list of endpoint responses with id)
Writes sim/out/ai-eval-gemini.csv and adds a "gemini" block to sim/out/ai-eval.json."""
import json, sys, csv
cases = {c['id']: c for c in json.load(open('data/ai-eval/synthetic.json'))['cases']}
res = json.load(open(sys.argv[1]))
def score(c, items):
    left = [i['amount'] for i in items]; m = cat = 0
    got = {i['amount']: i for i in items}
    for e in c['expected']:
        if e['amount'] in left:
            left.remove(e['amount']); m += 1
            if got[e['amount']].get('category') == e['category']: cat += 1
    return m, len(c['expected']) - m, len(left), cat
rows = []
for r in res:
    c = cases[r['id']]; items = r.get('items') or []
    m, miss, extra, cat = score(c, items)
    rows.append(dict(id=r['id'], text=c['text'], tags=c['tags'], source=r.get('source'), model=r.get('model'),
        fallback=(r.get('fallbackReason') or '')[:40], latency=r.get('latencyMs'),
        expected='+'.join(str(e['amount']) for e in c['expected']), got='+'.join(str(i['amount']) for i in items),
        matched=m, missed=miss, extra=extra, cat=cat, exact=(miss == 0 and extra == 0)))
def summ(rs):
    exp = sum(r['matched'] + r['missed'] for r in rs); got = sum(r['matched'] + r['extra'] for r in rs); mt = sum(r['matched'] for r in rs)
    lat = sorted(r['latency'] for r in rs if r['latency'] is not None)
    pct = lambda a, b: round(a / b * 1000) / 10 if b else None
    tags = {}
    for r in rs:
        for t in r['tags']:
            tags.setdefault(t, [0, 0]); tags[t][1] += 1; tags[t][0] += r['exact']
    return dict(cases=len(rs), exact_sentence_pct=pct(sum(r['exact'] for r in rs), len(rs)), item_recall_pct=pct(mt, exp),
        item_precision_pct=pct(mt, got), category_pct_of_matched=pct(sum(r['cat'] for r in rs), mt),
        missed_items=sum(r['missed'] for r in rs), extra_items=sum(r['extra'] for r in rs),
        latency_ms_p50=lat[len(lat) // 2] if lat else None, latency_ms_p95=lat[int(len(lat) * 0.95)] if lat else None,
        exact_by_tag={t: f'{a}/{b}' for t, (a, b) in tags.items()})
g = [r for r in rows if r['source'] == 'gemini']
out = json.load(open('sim/out/ai-eval.json'))
out.pop('gemini', None)
out['gemini_run'] = dict(how='Deployed app https://momopo.vercel.app, endpoint /api/ai/parse, one request about every 5 s from a browser, 18 November 2026',
    model=sorted({r['model'] for r in g if r['model']}), fallbacks=[[r['id'], r['fallback']] for r in rows if r['source'] != 'gemini'])
out['product_as_users_see_it'] = summ(rows)
out['gemini_answers_only'] = summ(g)
json.dump(out, open('sim/out/ai-eval.json', 'w'), indent=2, ensure_ascii=False)
with open('sim/out/ai-eval-gemini.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['id','text','tags','source','model','expected','got','exact','missed','extra','latency_ms','fallback'])
    for r in rows: w.writerow([r['id'], r['text'], ' '.join(r['tags']), r['source'], r['model'], r['expected'], r['got'], r['exact'], r['missed'], r['extra'], r['latency'], r['fallback']])
print(json.dumps({k: out[k] for k in ('gemini_run','product_as_users_see_it','gemini_answers_only')}, indent=1, ensure_ascii=False))
