import { Ref, ref } from 'vue';
import router, { Columns } from '../router';

export enum ColumnType {
    ADDRESS = 'column-address',
    ACCOUNT = 'column-account',
    SIDEBAR = 'column-sidebar',
}

// Note: lazily initialized, which was required with the Vue 2 composition-api plugin. With Vue 2.7's built-in
//       Composition API, the activeMobileColumn variable could be directly instantiated as ref.
let activeMobileColumn: Ref<ColumnType> | null = null;

// Adding this code at the end of the call stack so router is not undefined
setTimeout(() => {
    router.beforeResolve((to, from, next) => {
        if (!activeMobileColumn) {
            activeMobileColumn = ref(ColumnType.ACCOUNT);
        }

        const { meta, path, query: newQuery } = to;
        const { query: oldQuery } = from;

        if (newQuery && newQuery.sidebar) {
            activeMobileColumn.value = ColumnType.SIDEBAR;
        } else if (oldQuery && oldQuery.sidebar) {
            activeMobileColumn.value = ColumnType.ACCOUNT;
        } else if (meta) {
            switch (meta.column) {
                case Columns.DYNAMIC:
                    switch (path) {
                        case '/': activeMobileColumn.value = ColumnType.ACCOUNT; break;
                        case '/transactions': activeMobileColumn.value = ColumnType.ADDRESS; break;
                        default: break; // Don't change column
                    }
                    break;
                case Columns.ACCOUNT: activeMobileColumn.value = ColumnType.ACCOUNT; break;
                case Columns.ADDRESS: activeMobileColumn.value = ColumnType.ADDRESS; break;
                default: break;
            }
        }

        next();
    });
}, 0);

export function useActiveMobileColumn() {
    if (!activeMobileColumn) {
        activeMobileColumn = ref(ColumnType.ACCOUNT);
    }

    return {
        activeMobileColumn,
    };
}
