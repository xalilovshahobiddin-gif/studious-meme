<?php
declare(strict_types=1);

namespace BlueWolf;

use PDO;

/** Yupqa PDO oʻrami. Barcha vaqtlar UTC. */
final class Db
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo === null) {
            $env = \bw_env();
            self::$pdo = new PDO($env['db_dsn'], $env['db_user'], $env['db_pass'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
            self::$pdo->exec("SET time_zone = '+00:00'");
        }
        return self::$pdo;
    }

    public static function one(string $sql, array $args = []): ?array
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($args);
        $row = $st->fetch();
        return $row === false ? null : $row;
    }

    public static function all(string $sql, array $args = []): array
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($args);
        return $st->fetchAll();
    }

    public static function val(string $sql, array $args = []): mixed
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($args);
        $v = $st->fetchColumn();
        return $v === false ? null : $v;
    }

    public static function exec(string $sql, array $args = []): int
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($args);
        return $st->rowCount();
    }

    public static function insert(string $table, array $row): int
    {
        $cols = array_keys($row);
        $sql = 'INSERT INTO ' . $table . ' (' . implode(',', $cols) . ') VALUES (' .
            implode(',', array_fill(0, count($cols), '?')) . ')';
        self::exec($sql, array_values($row));
        return (int) self::pdo()->lastInsertId();
    }

    public static function update(string $table, array $set, string $where, array $args = []): int
    {
        $parts = [];
        foreach (array_keys($set) as $c) {
            $parts[] = "$c = ?";
        }
        return self::exec('UPDATE ' . $table . ' SET ' . implode(', ', $parts) . ' WHERE ' . $where,
            array_merge(array_values($set), $args));
    }

    /** Tranzaksiya ichida bajarish; ichma-ich chaqiruv tashqi tranzaksiyaga qoʻshiladi. */
    public static function tx(callable $fn): mixed
    {
        $pdo = self::pdo();
        if ($pdo->inTransaction()) {
            return $fn();
        }
        $pdo->beginTransaction();
        try {
            $res = $fn();
            $pdo->commit();
            return $res;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    public static function dt(int $ts): string
    {
        return gmdate('Y-m-d H:i:s', $ts);
    }

    public static function ts(?string $dt): ?int
    {
        return $dt === null ? null : (int) strtotime($dt . ' UTC');
    }
}
