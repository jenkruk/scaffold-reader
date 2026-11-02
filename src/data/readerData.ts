import source from '../../scaffold-reader-data.json'
import { normalizeData } from './normalize'
import type { RawScaffoldReaderData } from './rawTypes'

// Annotating (not casting) makes TypeScript check that the JSON fits the raw types.
const raw: RawScaffoldReaderData = source

/** The trusted data for the app, normalized once at module load. */
export const { data: readerData, diagnostics: readerDiagnostics } = normalizeData(raw)
