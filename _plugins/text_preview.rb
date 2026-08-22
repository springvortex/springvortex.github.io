# frozen_string_literal: true

module TextPreview
  BLOCKQUOTE_TAG = /<blockquote\b[^>]*>|<\/blockquote\s*>/i.freeze

  # Removes a blockquote only when it is the first markup in rendered content.
  # Balanced scanning keeps nested blockquotes and later blockquotes intact.
  def strip_leading_blockquote(input)
    text = input.to_s
    leading = text.match(/\A\s*<blockquote\b[^>]*>/i)
    return text unless leading

    depth = 1
    position = leading.end(0)
    while (tag = text.match(BLOCKQUOTE_TAG, position))
      depth += tag[0].start_with?("</") ? -1 : 1
      return text[(tag.end(0))..].lstrip if depth.zero?

      position = tag.end(0)
    end

    text
  end
end

Liquid::Template.register_filter(TextPreview)
