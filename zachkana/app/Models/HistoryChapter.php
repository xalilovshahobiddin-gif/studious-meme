<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HistoryChapter extends Model
{
    protected $fillable = ['slug', 'title', 'body', 'quote_text', 'quote_cite', 'position'];

    /** Matn boʻsh qatorlar bilan xatboshilarga boʻlinadi. */
    public function paragraphs(): array
    {
        return array_values(array_filter(array_map('trim', preg_split("/\R\s*\R/", $this->body ?? ''))));
    }
}
