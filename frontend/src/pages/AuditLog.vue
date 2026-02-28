<template>
    <transition name="slide-fade" appear>
        <div>
            <h1 class="mb-3">{{ $t("auditLog") }}</h1>

            <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="d-flex gap-2 align-items-center">
                    <select v-model="actionFilter" class="form-select form-select-sm" style="width: auto;" @change="loadLogs">
                        <option value="">{{ $t("allActions") }}</option>
                        <option value="stack.">Stack</option>
                        <option value="auth.">Auth</option>
                        <option value="settings.">{{ $t("Settings") }}</option>
                        <option value="network.">{{ $t("networks") }}</option>
                        <option value="image.">{{ $t("images") }}</option>
                    </select>
                </div>
                <button class="btn btn-normal btn-sm" @click="loadLogs">
                    <font-awesome-icon icon="rotate" class="me-1" /> {{ $t("refresh") }}
                </button>
            </div>

            <div v-if="loading" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>

            <div v-else-if="entries.length === 0" class="text-center py-4 text-muted">
                {{ $t("noAuditRecords") }}
            </div>

            <div v-else class="shadow-box">
                <table class="table table-hover mb-0">
                    <thead>
                        <tr>
                            <th>{{ $t("timestamp") }}</th>
                            <th>{{ $t("Username") }}</th>
                            <th>{{ $t("action") }}</th>
                            <th>{{ $t("resource") }}</th>
                            <th>{{ $t("ipAddress") }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="entry in entries" :key="entry.id">
                            <td class="text-muted small">
                                {{ formatTime(entry.created_at) }}
                            </td>
                            <td>{{ entry.username }}</td>
                            <td>
                                <span class="badge" :class="actionBadgeClass(entry.action)">
                                    {{ formatAction(entry.action) }}
                                </span>
                            </td>
                            <td>
                                <span v-if="entry.resource_name">
                                    <span class="text-muted small">{{ entry.resource_type }}/</span>{{ entry.resource_name }}
                                </span>
                                <span v-else class="text-muted">-</span>
                            </td>
                            <td class="text-muted small">{{ entry.ip_address || "-" }}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- Pagination -->
                <div v-if="total > pageSize" class="d-flex justify-content-between align-items-center p-3 border-top">
                    <span class="text-muted small">
                        {{ offset + 1 }}-{{ Math.min(offset + pageSize, total) }} / {{ total }}
                    </span>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-secondary" :disabled="offset === 0" @click="prevPage">
                            <font-awesome-icon icon="chevron-left" />
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" :disabled="offset + pageSize >= total" @click="nextPage">
                            <font-awesome-icon icon="chevron-right" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>

<script>
export default {
    data() {
        return {
            entries: [],
            total: 0,
            offset: 0,
            pageSize: 50,
            actionFilter: "",
            loading: true,
        };
    },
    mounted() {
        this.loadLogs();
    },
    methods: {
        loadLogs() {
            this.loading = true;
            this.$root.getSocket().emit("getAuditLog", {
                limit: this.pageSize,
                offset: this.offset,
                actionFilter: this.actionFilter || undefined,
            }, (res) => {
                this.loading = false;
                if (res.ok) {
                    this.entries = res.entries;
                    this.total = res.total;
                } else {
                    this.$root.toastRes(res);
                }
            });
        },
        prevPage() {
            this.offset = Math.max(0, this.offset - this.pageSize);
            this.loadLogs();
        },
        nextPage() {
            this.offset += this.pageSize;
            this.loadLogs();
        },
        formatTime(timestamp) {
            if (!timestamp) { return "-"; }
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMin = Math.floor(diffMs / 60000);

            if (diffMin < 1) { return "just now"; }
            if (diffMin < 60) { return `${diffMin}m ago`; }

            const diffHours = Math.floor(diffMin / 60);
            if (diffHours < 24) { return `${diffHours}h ago`; }

            const diffDays = Math.floor(diffHours / 24);
            if (diffDays < 7) { return `${diffDays}d ago`; }

            return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        },
        formatAction(action) {
            const actionMap = {
                "stack.deploy": "Deploy",
                "stack.start": "Start",
                "stack.stop": "Stop",
                "stack.restart": "Restart",
                "stack.down": "Down",
                "stack.update": "Update",
                "stack.delete": "Delete",
                "stack.save": "Save",
                "auth.login": "Login",
                "auth.login_failed": "Login Failed",
                "auth.password_change": "Password Change",
                "settings.change": "Settings Change",
                "network.create": "Create Network",
                "network.remove": "Remove Network",
                "image.remove": "Remove Image",
                "image.prune": "Prune Images",
            };
            return actionMap[action] || action;
        },
        actionBadgeClass(action) {
            if (action.includes("delete") || action.includes("remove") || action.includes("prune") || action.includes("down")) {
                return "bg-danger";
            }
            if (action.includes("failed")) {
                return "bg-warning text-dark";
            }
            if (action.includes("login") || action.includes("deploy") || action.includes("create")) {
                return "bg-success";
            }
            return "bg-secondary";
        },
    },
};
</script>

<style lang="scss" scoped>
.shadow-box {
    border-radius: 16px;
    overflow: hidden;
}

.table {
    margin-bottom: 0;

    th {
        font-weight: 600;
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom-width: 2px;
    }

    td {
        vertical-align: middle;
    }
}

.badge {
    font-size: 0.75rem;
    padding: 0.35em 0.65em;
    border-radius: 6px;
}
</style>
