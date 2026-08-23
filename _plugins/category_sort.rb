# frozen_string_literal: true

module CategorySort
  def sort_categories_natural(categories)
    return [] unless categories.respond_to?(:to_a)

    categories.to_a.sort_by { |name, _posts| name.to_s.downcase }
  end

  def sort_taxonomy_by_count(taxonomy)
    return [] unless taxonomy.respond_to?(:to_a)

    taxonomy.to_a.sort_by { |_name, items| -items.to_a.size }
  end

  def latest_categories(posts, limit = 10)
    return [] unless posts.respond_to?(:to_a)

    posts
      .to_a
      .sort_by { |post| -post.date.to_time.to_i }
      .flat_map { |post| post.data['categories'].to_a }
      .uniq
      .first(limit)
  end
end

Liquid::Template.register_filter(CategorySort)
