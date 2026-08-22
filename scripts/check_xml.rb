#!/usr/bin/env ruby
# frozen_string_literal: true

require "rexml/document"

paths = ARGV.reject(&:empty?)
abort "No XML files supplied" if paths.empty?

paths.each do |file_path|
  begin
    REXML::Document.new(File.read(file_path))
  rescue REXML::ParseException => e
    abort "#{file_path}: #{e.message}"
  end
end
