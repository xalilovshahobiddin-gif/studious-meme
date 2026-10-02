<?php

namespace Tests\Feature;

use Tests\TestCase;

/** index.html dagi fayllar versiyasi (?v=) service worker versiyasi bilan bir xil boʻlishi shart. */
class AssetVersionTest extends TestCase
{
    public function test_local_assets_are_versioned_like_service_worker(): void
    {
        $html = file_get_contents(public_path('index.html'));
        preg_match("/const VERSION = '([^']+)'/", file_get_contents(public_path('sw.js')), $m);
        $version = $m[1];

        $this->assertStringContainsString('<meta name="zk-version" content="'.$version.'">', $html);
        preg_match_all('/(?:src|href)="((?:js|css|ui)\/[^"]+)"/', $html, $assets);
        $this->assertNotEmpty($assets[1]);
        foreach ($assets[1] as $asset) {
            $this->assertStringEndsWith('?v='.$version, $asset, "$asset versiyasiz — brauzer eski faylni keshdan olishi mumkin");
        }
    }
}
