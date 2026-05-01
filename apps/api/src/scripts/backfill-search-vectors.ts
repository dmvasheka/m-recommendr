import '../dotenv-loader';
import { supabase } from '@repo/db';

async function backfill(table: 'movies' | 'tv_shows', batchSize = 1000, pauseMs = 200) {
    const triggerColumn = table === 'movies' ? 'title' : 'name';
    console.log(`🔄 Backfilling tsvector on ${table} via column ${triggerColumn}`);

    let totalDone = 0;
    while (true) {
        const { data, error } = await supabase
            .from(table)
            .select('id')
            .is('search_vector_en', null)
            .order('id')
            .limit(batchSize);

        if (error) throw new Error(`fetch failed: ${error.message}`);
        if (!data || data.length === 0) break;

        const ids = data.map((row: { id: number }) => row.id);

        const { error: updErr } = await (supabase.rpc as any)('touch_rows_for_tsvector', {
            p_table: table,
            p_column: triggerColumn,
            p_ids: ids,
        });

        if (updErr) throw new Error(`update failed: ${updErr.message}`);

        totalDone += data.length;
        console.log(`  progress: +${data.length} (total ${totalDone})`);
        await new Promise((r) => setTimeout(r, pauseMs));
    }

    console.log(`✅ Backfilled ${totalDone} rows in ${table}`);
}

async function main() {
    const target = process.argv[2] as 'movies' | 'tv_shows' | undefined;
    if (target === 'movies' || target === 'tv_shows') {
        await backfill(target);
    } else {
        await backfill('movies');
        await backfill('tv_shows');
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
