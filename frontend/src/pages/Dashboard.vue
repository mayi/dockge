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
    background-color: #F3EDF7; // Surface Container (Light)
    border-top: none;
    padding: 12px 0 calc(16px + env(safe-area-inset-bottom));
    box-shadow: 0 -1px 3px 0 rgba(0, 0, 0, 0.1), 0 -1px 2px 0 rgba(0, 0, 0, 0.05); // Elevation 2

    .dark & {
        background-color: #2B2930; // Surface Container High (Dark)
        box-shadow: 0 -1px 3px 0 rgba(0, 0, 0, 0.5), 0 -1px 2px 0 rgba(0, 0, 0, 0.3); // Elevation 2 (Dark)
    }
}

.mobile-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 4px 16px;
    border-radius: 16px; // Pill shape for active icon background
    font-size: 12px;
    font-weight: 500;
    text-decoration: none;
    color: #49454F; // On-Surface-Variant
    transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1), color 0.2s;

    svg {
        font-size: 24px;
        margin-bottom: 4px;
        padding: 4px 16px; // Icon container padding
        border-radius: 16px; // Icon Pill
        transition: background-color 0.2s;
    }

    &.active {
        color: #1D1B20; // On-Surface
        
        svg {
            background-color: #EADDFF; // Secondary Container
            color: #21005D; // On-Secondary Container
        }
        
        .dark & {
            color: #E6E1E5; // On-Surface (Dark)
            
            svg {
                background-color: #4A4458; // Secondary Container (Dark)
                color: #E8DEF8; // On-Secondary Container (Dark)
            }
        }
    }
}

// Sidebar toggle button
.sidebar-toggle {
    position: fixed;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1000;
    background-color: #F3EDF7; // Surface Container High
    color: #49454F; // On-Surface-Variant
    border: none;
    border-radius: 0 16px 16px 0; // Large M3 border radius
    padding: 24px 8px;
    cursor: pointer;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15); // Elevation 1
    transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.2s;

    &:hover {
        background-color: #E8DEF8; // State layer
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15); // Elevation 2
    }

    &.collapsed {
        background-color: $primary; // Highlight when collapsed so it's visible
        color: #FFFFFF;
    }

    .dark & {
        background-color: #2B2930; // Surface Container High (Dark)
        color: #CAC4D0; // On-Surface-Variant (Dark)
        
        &:hover {
            background-color: #4A4458; // State layer (Dark)
        }
        
        &.collapsed {
            background-color: #D0BCFF; // Primary (Dark)
            color: #381E72; // On-Primary (Dark)
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
