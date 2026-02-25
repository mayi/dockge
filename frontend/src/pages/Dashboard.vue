<template>
    <div class="container-fluid">
        <!-- Sidebar toggle button for desktop -->
        <button v-if="!$root.isMobile" class="sidebar-toggle" :class="{ 'collapsed': sidebarCollapsed }" @click="toggleSidebar">
            <font-awesome-icon :icon="sidebarCollapsed ? 'angles-right' : 'angles-left'" />
        </button>

        <div class="row">
            <transition name="slide-sidebar">
                <div v-if="!$root.isMobile && !sidebarCollapsed" class="col-12 col-md-4 col-xl-3 sidebar">
                    <div>
                        <router-link to="/compose" class="btn btn-primary mb-3"><font-awesome-icon icon="plus" /> {{ $t("compose") }}</router-link>
                    </div>
                    <StackList :scrollbar="true" />
                </div>
            </transition>

            <div ref="container" class="col-12" :class="mainContentClass" :style="mainContentStyle">
                <!-- Add :key to disable vue router re-use the same component -->
                <router-view :key="$route.fullPath" :calculatedHeight="height" />
            </div>
        </div>

        <!-- Mobile bottom navigation -->
        <div v-if="$root.isMobile && $root.loggedIn" class="mobile-bottom-nav">
            <router-link to="/" class="mobile-nav-item" exact-active-class="active">
                <font-awesome-icon icon="home" />
                <span>{{ $t("home") }}</span>
            </router-link>
            <router-link to="/compose" class="mobile-nav-item" active-class="active">
                <font-awesome-icon icon="plus" />
                <span>{{ $t("compose") }}</span>
            </router-link>
            <router-link to="/console" class="mobile-nav-item" active-class="active">
                <font-awesome-icon icon="terminal" />
                <span>{{ $t("console") }}</span>
            </router-link>
            <router-link to="/settings/general" class="mobile-nav-item" active-class="active">
                <font-awesome-icon icon="cog" />
                <span>{{ $t("Settings") }}</span>
            </router-link>
        </div>
    </div>
</template>

<script>

import StackList from "../components/StackList.vue";

export default {
    components: {
        StackList,
    },
    data() {
        return {
            height: 0,
            sidebarCollapsed: localStorage.getItem("sidebarCollapsed") === "true",
        };
    },
    computed: {
        mainContentClass() {
            if (this.$root.isMobile) {
                return "";
            }
            return this.sidebarCollapsed ? "col-md-12" : "col-md-8 col-xl-9";
        },
        mainContentStyle() {
            if (this.$root.isMobile) {
                return {
                    "padding-bottom": "80px",
                    "margin-bottom": "0",
                };
            }
            return {
                "margin-bottom": "1rem",
            };
        },
    },
    mounted() {
        this.height = this.$refs.container.offsetHeight;
    },
    methods: {
        toggleSidebar() {
            this.sidebarCollapsed = !this.sidebarCollapsed;
            localStorage.setItem("sidebarCollapsed", this.sidebarCollapsed ? "true" : "false");
        },
    },
};
</script>

<style lang="scss" scoped>
@import "../styles/vars.scss";

.container-fluid {
    width: 98%;
}

.sidebar {
    position: sticky;
    top: 80px;
    max-height: calc(100vh - 100px);
    overflow-y: auto;
}

.mobile-bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    display: flex;
    justify-content: space-around;
    background-color: #fff;
    border-top: 1px solid #e8e8e8;
    padding: 6px 0 calc(6px + env(safe-area-inset-bottom));
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.06);

    .dark & {
        background-color: $dark-header-bg;
        border-top-color: $dark-border-color;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
    }
}

.mobile-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 16px;
    border-radius: 12px;
    font-size: 11px;
    text-decoration: none;
    color: $dark-font-color3;
    transition: color 0.15s ease, background-color 0.15s ease;

    svg {
        font-size: 18px;
    }

    &.active {
        color: $primary;
        background-color: rgba($primary, 0.08);
    }
}

// Sidebar toggle button
.sidebar-toggle {
    position: fixed;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1000;
    background: $primary;
    color: white;
    border: none;
    border-radius: 0 8px 8px 0;
    padding: 12px 8px;
    cursor: pointer;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
    transition: all 0.3s $easing-in-out;

    &:hover {
        padding-right: 12px;
        box-shadow: 3px 0 12px rgba(0, 0, 0, 0.25);
    }

    &.collapsed {
        background: $primary-gradient;
    }

    svg {
        font-size: 16px;
    }

    .dark & {
        box-shadow: 2px 0 8px rgba(0, 0, 0, 0.4);

        &:hover {
            box-shadow: 3px 0 12px rgba(0, 0, 0, 0.6);
        }
    }
}

// Sidebar slide animation
.slide-sidebar-enter-active,
.slide-sidebar-leave-active {
    transition: all 0.3s $easing-in-out;
}

.slide-sidebar-enter-from {
    transform: translateX(-100%);
    opacity: 0;
}

.slide-sidebar-leave-to {
    transform: translateX(-100%);
    opacity: 0;
}
</style>
