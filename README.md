# Portfolio — Ali Azami

Site statique bilingue (français à la racine, anglais sous `en/`), sans framework.
Les pages sont **générées** : on ne modifie jamais `index.html` à la main.

## Modifier le site

| Je veux changer… | Fichier à éditer |
|---|---|
| Un texte de l'accueil (hero, ODS, compétences, contact…) | `src/content/fr.json` et `src/content/en.json` |
| Le contenu d'une étude de cas | `src/content/projects.json` (les deux langues y sont) |
| E-mail, téléphone, LinkedIn, disponibilité affichée ou non | `src/site.json` |
| La mise en page | `src/templates/*.html` |
| Le style, les animations | `assets/css/style.css`, `assets/js/main.js` |

Puis régénérer :

```bash
python src/build.py
```

Seule dépendance : `jinja2` (déjà fourni avec Anaconda).

### Cas courants

- **Mettre à jour le CV** : remplacer `assets/cv/CV-Ali-Azami-FR.pdf` et `assets/cv/CV-Ali-Azami-EN.pdf`
  en gardant exactement ces noms, puis régénérer. Si un fichier manque, ses boutons disparaissent.
- **Changer la date de disponibilité** : clé `hero.availability` dans `fr.json` et `en.json`.
  Pour ne plus l'afficher du tout : `"show_availability": false` dans `src/site.json`.
- **Changer la photo** : remplacer `ali_photo.jpg` à la racine, ajuster le cadrage dans
  `src/images.py` (fonction `portrait`), puis `python src/images.py` et `python src/build.py`.
- **Ajouter un projet** : dupliquer un bloc dans `src/content/projects.json`, changer `id` et les deux `slug`.

## Voir le site en local

```bash
python -m http.server 4173
```

Puis ouvrir `http://localhost:4173`.

## Mise en ligne (GitHub Pages)

Le site est servi depuis la racine du dépôt `portfolio`. À envoyer :
`index.html`, `404.html`, `sitemap.xml`, `.nojekyll`, et les dossiers `assets/`, `en/`, `projets/`
(`src/` peut suivre, il ne contient rien de sensible).

**Ne jamais envoyer `temp/`** : il contient des documents internes. Il est exclu par `.gitignore`,
mais un glisser-déposer dans l'interface web de GitHub ne tient pas compte de ce fichier.

## Référencement : à faire une fois le site en ligne

1. Google Search Console : ajouter la propriété `https://ali123az.github.io/portfolio/`
   (validation possible par la balise à coller dans `google_site_verification` de `src/site.json`).
2. Y soumettre `https://ali123az.github.io/portfolio/sitemap.xml`.
3. Bing Webmaster Tools : importer la propriété depuis Search Console.
4. Mettre l'adresse du site sur LinkedIn (section « Coordonnées » et « Sélection »), le profil GitHub
   et la signature d'e-mail : ce sont ces liens qui font remonter la page sur une recherche du nom.
5. Tester un partage avec l'outil LinkedIn Post Inspector pour vérifier l'aperçu.

Si l'adresse du site change (nom de domaine personnel), modifier `site_url` dans `src/site.json`
et régénérer : adresses canoniques, sitemap et balises de partage suivent.
