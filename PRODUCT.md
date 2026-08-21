# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Jekyll static site, vanilla HTML/CSS/JavaScript, deployed by GitHub Pages. The repository already contains the build workflow and asset pipeline; no framework migration is part of this redesign.

## Users

Assumption from the site's content and explicit redesign brief: zjc and developers who arrive looking for concrete notes on Spring Cloud Alibaba, Java microservices, component deployment, and local/production workflows. They want to scan titles and categories, search a specific term, then read long technical articles with code.

## Product Purpose

SpringVortex Notes is a personal technical reading room. It turns hands-on project work into durable, findable articles. Success means a visitor can identify useful material quickly, read comfortably for a long time, and jump between related articles without losing context.

## Positioning

The site's distinctive material is first-hand implementation and deployment experience from a real Spring Cloud Alibaba project, not abstract framework marketing.

## Operating Context

Content includes the local `spring-cloud-alibaba` project, service modules, middleware deployment, configuration, observability, and troubleshooting. Readers may arrive from search, category pages, or search results and often need code, commands, tables, and source links side by side.

## Capabilities and Constraints

- Preserve existing Jekyll routes and page behavior.
- Preserve primary Chinese navigation labels and blog content.
- Keep desktop article recommendations and the article table of contents.
- Keep light/dark mode, search, categories, bookmarks, about, RSS, PWA, and social sharing behavior.
- Keep the GitHub Pages build compatible; avoid a framework or heavy runtime dependency.

## Brand Commitments

Site name is SpringVortex Notes. Default author is zjc. The site language is primarily Chinese. Existing logo and favicon assets are part of the brand.

## Evidence on Hand

- 87 Markdown articles under `_posts/`, organized by year/month/day.
- Real component and module notes based on the local Spring Cloud Alibaba project.
- Existing logo, favicon, search index, RSS, and PWA assets.
- No testimonials, customer claims, or commercial metrics are available; none may be invented.

## Product Principles

1. Reading comprehension outranks visual spectacle.
2. Code, commands, and tables remain first-class content.
3. Navigation and related articles should make research feel continuous.
4. Design should feel like a precise engineering notebook, not a generic SaaS landing page.
5. Performance and accessibility are constraints on every visual decision.
