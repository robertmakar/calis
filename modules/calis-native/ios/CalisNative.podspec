require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'CalisNative'
  s.version        = package['version']
  s.summary        = 'CALIS native module'
  s.description    = 'Native CALIS appearance, icons, and HealthKit workout writes'
  s.license        = 'UNLICENSED'
  s.author         = 'CALIS'
  s.homepage       = 'https://calis.app'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'HealthKit'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }
  s.source_files   = '*.{h,m,mm,swift}'
end
