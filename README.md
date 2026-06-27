# robansuini.com

Personal website of Roberto Ansuini - Engineering manager, leadership toolkit creator, and newsletter writer.

## 🌐 Live Site

**https://robansuini.com**

## 🏗️ Tech Stack

- **Pure HTML/CSS** - No build process, no dependencies
- **GitHub Pages** - Deployed automatically from `master` branch
- **Font Awesome** - Icons
- **Plausible Analytics** - Privacy-friendly analytics

## 📝 Content

- **About**: Engineering leadership journey (15+ years)
- **Projects**: 
  - [leadingin.tech](https://leadingin.tech) - Toolkit for engineering leaders
  - [the.leadingintech.email](https://the.leadingintech.email) - Weekly newsletter on leadership
- **Newsletter CTA**: Prominently featured signup

## 🚀 Development

**Local preview:**
```bash
python3 -m http.server 8000
# Visit http://localhost:8000
```

**Quality checks:**
```bash
node scripts/check-external-links.js
node --test scripts/check-external-links.test.js
```

These match the `site-checks` CI workflow: validating that every `target="_blank"` link across all repo HTML files includes `rel="noopener noreferrer"` to prevent reverse-tabnabbing, then running the checker regression tests.

**Deploy:**
- Push/merge to `master` → auto-deploys to GitHub Pages
- Deployment takes ~1-2 minutes
- GitHub Actions runs `site-checks` on pushes/PRs

## 📊 Performance

- Fast load times (~250ms)
- Mobile-responsive
- Minimal dependencies (3 resources)

## 📄 License

Personal site - all rights reserved.

---

**Last updated:** February 2026 (v9 - Link security hardening + CI checks)
