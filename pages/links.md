---
layout: mypost
title: 书签
---

<ul class="links-list">
  {%- for link in site.links %}
  <li>
    <a href="{{ link.url }}" title="{{ link.desc }}" target="_blank" rel="noopener noreferrer">{{ link.title }}</a>
  </li>
  {%- endfor %}
</ul>
