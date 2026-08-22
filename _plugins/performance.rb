# frozen_string_literal: true

require "digest"
require "fastimage"
require "pathname"

module Performance
  SOURCE_DIRS = %w(_includes _layouts _plugins _posts pages posts static).freeze
  SOURCE_FILES = %w(_config.yml index.html 404.md service-worker.js).freeze

  def self.content_fingerprint(site)
    files = SOURCE_DIRS.flat_map { |dir| Dir.glob(File.join(site.source, dir, "**", "*")) }
    files.concat(SOURCE_FILES.map { |file| File.join(site.source, file) })
    digest = Digest::MD5.new

    files.sort.each do |path|
      next unless File.file?(path)

      relative_path = Pathname.new(path).relative_path_from(Pathname.new(site.source)).to_s
      digest.update(relative_path)
      digest.update(File.read(path, mode: "rb"))
    end

    digest.hexdigest.slice(0, 12)
  end

  def self.local_image_path(site, url)
    return nil unless url.start_with?("/")

    baseurl = site.config["baseurl"].to_s
    pathname = url.split("?").first
    pathname = pathname.delete_prefix(baseurl) unless baseurl.empty?
    return nil if pathname.empty?
    pathname = pathname.delete_prefix("/")

    path = File.expand_path(pathname, site.source)
    source = File.expand_path(site.source)
    path.start_with?(source + File::SEPARATOR) ? path : nil
  end

  def self.optimize_images(document)
    document.output = document.output.gsub(/<img\b[^>]*>/i) do |tag|
      next tag if tag.match?(/\bloading\s*=/i)

      src = tag.match(/\bsrc=(["'])([^"']+)\1/i)
      path = src ? local_image_path(document.site, src[2]) : nil
      size = path ? FastImage.size(path) : nil
      attributes = +' loading="lazy" decoding="async"'
      attributes << %( width="#{size[0]}" height="#{size[1]}") if size

      tag.sub(/\A<img/i) { |match| "#{match}#{attributes}" }
    end
  end
end

# Cache versions follow source content instead of deployment time. Rebuilding
# unchanged content therefore continues to use browser and SW caches.
Jekyll::Hooks.register :site, :after_init do |site|
  site.config["buildAt"] = Performance.content_fingerprint(site)
end

# Article images are usually below the first screen. Lazy loading plus width
# and height avoids downloading all images immediately and prevents CLS.
Jekyll::Hooks.register :posts, :post_render do |document|
  Performance.optimize_images(document)
end
