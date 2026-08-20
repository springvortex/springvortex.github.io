# frozen_string_literal: true

require "digest"

module Md5Permalink
  ASSET_PATTERN = /\.(?:webp|png|jpe?g|gif|svg|bmp|ico|pdf|zip|rar|7z|txt)(?:[?#]|\z)/i

  def self.asset_base(document)
    filename = File.basename(document.path)
    match = filename.match(/\A(\d{4})-(\d{2})-(\d{2})-/)
    return "" unless match

    baseurl = document.site.config["baseurl"].to_s.sub(%r{/\z}, "")
    "#{baseurl}/posts/#{match[1]}/#{match[2]}/#{match[3]}"
  end

  def self.asset_url(base, url)
    "#{base.sub(%r{/\z}, '')}/#{url}"
  end

  def self.relative_asset?(url)
    return false if url.start_with?("/", "#")
    return false if url.match?(%r{\A(?:[a-z][a-z0-9+.-]*:)?//}i)

    url.match?(ASSET_PATTERN)
  end

  def self.rewrite_assets(content, base)
    in_fenced_code = false

    content.lines.map do |line|
      if line.match?(%r{\A\s*(?:```|~~~)})
        in_fenced_code = !in_fenced_code
        next line
      end
      next line if in_fenced_code

      line = line.gsub(/(\]\()([^)\s]+)([^)]*\))/) do
        original = Regexp.last_match(0)
        prefix = Regexp.last_match(1)
        url = Regexp.last_match(2)
        suffix = Regexp.last_match(3)
        next original unless relative_asset?(url)

        "#{prefix}#{asset_url(base, url)}#{suffix}"
      end

      line.gsub(/\b(?:src|href)=(["'])([^"']+)\1/i) do
        original = Regexp.last_match(0)
        quote = Regexp.last_match(1)
        url = Regexp.last_match(2)
        next original unless relative_asset?(url)

        attribute = original.match(/\A(?:src|href)=/i)[0]
        "#{attribute}#{quote}#{asset_url(base, url)}#{quote}"
      end
    end.join
  end
end

# Article URLs use the MD5 digest of the source Markdown file. The digest is
# calculated on every build and is never written back to the source file.
Jekyll::Hooks.register :posts, :post_init do |document|
  source = File.read(document.path, mode: "rb").gsub("\r\n", "\n")
  digest = Digest::MD5.hexdigest(source)
  document.data["permalink"] = "/#{digest}/"
end

# Relative article assets continue to resolve from /posts/:year/:month/:day/
# even though article pages now use MD5 permalinks.
Jekyll::Hooks.register :posts, :pre_render do |document|
  base = Md5Permalink.asset_base(document)
  document.content = Md5Permalink.rewrite_assets(document.content, base) unless base.empty?
end
