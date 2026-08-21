---
layout: mypost
title: Bookmarks
---

<ul>
  {%- for link in site.links %}
  <li>
    <p><a href="{{ link.url }}" title="{{ link.desc }}" target="_blank" rel="noopener noreferrer">{{ link.title }}</a></p>
  </li>
  {%- endfor %}
</ul>
