# frozen_string_literal: true

module CategorySort
  def sort_categories_natural(categories)
    return [] unless categories.respond_to?(:to_a)

    categories.to_a.sort_by { |name, _posts| name.to_s.downcase }
  end
end

Liquid::Template.register_filter(CategorySort)
