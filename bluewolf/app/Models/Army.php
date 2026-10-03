<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Army extends Model
{
    public const ROLES = ['scout', 'attacker', 'defender', 'hunter'];

    protected $table = 'army';

    public $timestamps = false;

    public $incrementing = false;

    protected $primaryKey = null;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['tier' => 'integer', 'alive' => 'integer', 'on_march' => 'integer', 'injured' => 'integer'];
    }
}
