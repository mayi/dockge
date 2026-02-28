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
            <a class="mobile-nav-item" :class="{ active: showMoreMenu }" @click.prevent="showMoreMenu = !showMoreMenu">
                <font-awesome-icon icon="ellipsis" />
                <span>{{ $t("more") }}</span>
            </a>
        </div>

        <!-- More menu slide-up panel -->
        <transition name="slide-up">
            <div v-if="showMoreMenu && $root.isMobile" class="more-menu-overlay" @click.self="showMoreMenu = false">
                <div class="more-menu-panel">
                    <div class="more-menu-handle" @click="showMoreMenu = false"></div>
                    <router-link to="/networks" class="more-menu-item" @click="showMoreMenu = false">
                        <font-awesome-icon icon="network-wired" class="more-menu-icon" />
                        <span>{{ $t("networks") }}</span>
                    </router-link>
                    <router-link to="/images" class="more-menu-item" @click="showMoreMenu = false">
                        <font-awesome-icon icon="box" class="more-menu-icon" />
                        <span>{{ $t("images") }}</span>
                    </router-link>
                    <router-link to="/templates" class="more-menu-item" @click="showMoreMenu = false">
                        <font-awesome-icon icon="file-code" class="more-menu-icon" />
                        <span>{{ $t("templates") }}</span>
                    </router-link>
                    <router-link to="/audit-log" class="more-menu-item" @click="showMoreMenu = false">
                        <font-awesome-icon icon="clock-rotate-left" class="more-menu-icon" />
                        <span>{{ $t("auditLog") }}</span>
                    </router-link>
                    <router-link to="/settings/general" class="more-menu-item" @click="showMoreMenu = false">
                        <font-awesome-icon icon="cog" class="more-menu-icon" />
                        <span>{{ $t("Settings") }}</span>
                    </router-link>
                </div>
            </div>
        </transition>
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
            showMoreMenu: false,
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
    watch: {
        "$route"() {
            this.showMoreMenu = false;
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

// More menu overlay & panel
.more-menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999;
    background: rgba(0, 0, 0, 0.4);
}

.more-menu-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #F3EDF7;
    border-radius: 16px 16px 0 0;
    padding: 8px 0 calc(80px + env(safe-area-inset-bottom));
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);

    .dark & {
        background: #2B2930;
        box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.5);
    }
}

.more-menu-handle {
    width: 40px;
    height: 4px;
    background: rgba(128, 128, 128, 0.3);
    border-radius: 2px;
    margin: 4px auto 12px;
    cursor: pointer;
}

.more-menu-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 24px;
    text-decoration: none;
    color: #49454F;
    font-size: 15px;
    font-weight: 500;
    transition: background-color 0.15s;

    &:hover, &:active {
        background: rgba(0, 0, 0, 0.05);
    }

    .dark & {
        color: #CAC4D0;

        &:hover, &:active {
            background: rgba(255, 255, 255, 0.05);
        }
    }
}

.more-menu-icon {
    width: 24px;
    text-align: center;
    font-size: 18px;
}

// Slide-up transition
.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.25s cubic-bezier(0.2, 0, 0, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
    opacity: 0;

    .more-menu-panel {
        transform: translateY(100%);
    }
}
</style>
