<template>
    <div>
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="mb-0">{{ $t("activeSessions") }}</h5>
            <button class="btn btn-outline-danger btn-sm" :disabled="loading" @click="revokeAllOther">
                <font-awesome-icon icon="right-from-bracket" class="me-1" /> {{ $t("revokeAllOther") }}
            </button>
        </div>

        <div v-if="loading" class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>

        <div v-else-if="sessions.length === 0" class="text-center py-4 text-muted">
            {{ $t("noActiveSessions") }}
        </div>

        <div v-else class="list-group">
            <div v-for="session in sessions" :key="session.id" class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <div class="d-flex align-items-center gap-2 mb-1">
                        <font-awesome-icon :icon="deviceIcon(session.userAgent)" class="text-muted" />
                        <strong>{{ browserName(session.userAgent) }}</strong>
                        <span v-if="session.isCurrent" class="badge bg-primary">{{ $t("currentSession") }}</span>
                    </div>
                    <div class="text-muted small">
                        {{ $t("ipAddress") }}: {{ session.ipAddress || "-" }}
                    </div>
                    <div class="text-muted small">
                        {{ $t("lastActive") }}: {{ formatTime(session.lastActiveAt) }}
                        &middot; {{ $t("created") }}: {{ formatTime(session.createdAt) }}
                    </div>
                </div>
                <button
                    v-if="!session.isCurrent"
                    class="btn btn-outline-danger btn-sm"
                    @click="revokeSession(session.id)"
                >
                    <font-awesome-icon icon="xmark" /> {{ $t("revoke") }}
                </button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            sessions: [],
            loading: true,
        };
    },
    mounted() {
        this.loadSessions();
    },
    methods: {
        loadSessions() {
            this.loading = true;
            this.$root.getSocket().emit("getActiveSessions", (res) => {
                this.loading = false;
                if (res.ok) {
                    this.sessions = res.sessions;
                } else {
                    this.$root.toastRes(res);
                }
            });
        },
        revokeSession(sessionId) {
            this.$root.getSocket().emit("revokeSession", sessionId, (res) => {
                this.$root.toastRes(res);
                if (res.ok) {
                    this.loadSessions();
                }
            });
        },
        revokeAllOther() {
            this.$root.getSocket().emit("revokeAllOtherSessions", (res) => {
                this.$root.toastRes(res);
                if (res.ok) {
                    this.loadSessions();
                }
            });
        },
        formatTime(timestamp) {
            if (!timestamp) { return "-"; }
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMin = Math.floor(diffMs / 60000);

            if (diffMin < 1) { return this.$t("justNow"); }
            if (diffMin < 60) { return `${diffMin}m ago`; }

            const diffHours = Math.floor(diffMin / 60);
            if (diffHours < 24) { return `${diffHours}h ago`; }

            const diffDays = Math.floor(diffHours / 24);
            if (diffDays < 7) { return `${diffDays}d ago`; }

            return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        },
        browserName(ua) {
            if (!ua) { return "Unknown"; }
            if (ua.includes("Firefox")) { return "Firefox"; }
            if (ua.includes("Edg")) { return "Edge"; }
            if (ua.includes("Chrome")) { return "Chrome"; }
            if (ua.includes("Safari")) { return "Safari"; }
            if (ua.includes("Opera") || ua.includes("OPR")) { return "Opera"; }
            return "Unknown Browser";
        },
        deviceIcon(ua) {
            if (!ua) { return "desktop"; }
            if (ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone")) {
                return "mobile-screen";
            }
            if (ua.includes("Tablet") || ua.includes("iPad")) {
                return "tablet-screen-button";
            }
            return "desktop";
        },
    },
};
</script>

<style lang="scss" scoped>
.list-group-item {
    border-radius: 10px;
    margin-bottom: 8px;
}
</style>
