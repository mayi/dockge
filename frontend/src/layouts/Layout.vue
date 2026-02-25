<template>
    <div :class="classes">
        <div v-if="! $root.socketIO.connected && ! $root.socketIO.firstConnect" class="lost-connection">
            <div class="container-fluid">
                {{ $root.socketIO.connectionErrorMsg }}
                <div v-if="$root.socketIO.showReverseProxyGuide">
                    {{ $t("reverseProxyMsg1") }} <a href="https://github.com/louislam/uptime-kuma/wiki/Reverse-Proxy" target="_blank">{{ $t("reverseProxyMsg2") }}</a>
                </div>
            </div>
        </div>

        <!-- Desktop header -->
        <header v-if="! $root.isMobile" class="d-flex flex-wrap align-items-center justify-content-center py-3 px-4 mb-3 border-bottom sticky-top top-header">
            <router-link to="/" class="d-flex align-items-center mb-0 me-md-auto text-dark text-decoration-none">
                <object class="bi me-2 ms-4 logo-icon" width="36" height="36" data="/icon.svg" />
                <span class="fs-4 title">Dockge</span>
            </router-link>

            <a v-if="hasNewVersion" target="_blank" href="https://github.com/louislam/dockge/releases" class="btn btn-warning me-3">
                <font-awesome-icon icon="arrow-alt-circle-up" /> {{ $t("newUpdate") }}
            </a>

            <ul class="nav nav-pills">
                <li v-if="$root.loggedIn" class="nav-item me-2">
                    <router-link to="/" class="nav-link">
                        <font-awesome-icon icon="home" /> {{ $t("home") }}
                    </router-link>
                </li>

                <li v-if="$root.loggedIn" class="nav-item me-2">
                    <router-link to="/console" class="nav-link">
                        <font-awesome-icon icon="terminal" /> {{ $t("console") }}
                    </router-link>
                </li>

                <li v-if="$root.loggedIn" class="nav-item">
                    <div class="dropdown dropdown-profile-pic">
                        <div class="nav-link" data-bs-toggle="dropdown">
                            <div class="profile-pic">{{ $root.usernameFirstChar }}</div>
                            <font-awesome-icon icon="angle-down" />
                        </div>

                        <!-- Header's Dropdown Menu -->
                        <ul class="dropdown-menu">
                            <!-- Username -->
                            <li>
                                <i18n-t v-if="$root.username != null" tag="span" keypath="signedInDisp" class="dropdown-item-text">
                                    <strong>{{ $root.username }}</strong>
                                </i18n-t>
                                <span v-if="$root.username == null" class="dropdown-item-text">{{ $t("signedInDispDisabled") }}</span>
                            </li>

                            <li><hr class="dropdown-divider"></li>

                            <!-- Functions -->

                            <!--<li>
                                <router-link to="/registry" class="dropdown-item" :class="{ active: $route.path.includes('settings') }">
                                    <font-awesome-icon icon="warehouse" /> {{ $t("registry") }}
                                </router-link>
                            </li>-->

                            <li>
                                <button class="dropdown-item" @click="scanFolder">
                                    <font-awesome-icon icon="arrows-rotate" /> {{ $t("scanFolder") }}
                                </button>
                            </li>

                            <li>
                                <router-link to="/settings/general" class="dropdown-item" :class="{ active: $route.path.includes('settings') }">
                                    <font-awesome-icon icon="cog" /> {{ $t("Settings") }}
                                </router-link>
                            </li>

                            <li>
                                <button class="dropdown-item" @click="$root.logout">
                                    <font-awesome-icon icon="sign-out-alt" />
                                    {{ $t("Logout") }}
                                </button>
                            </li>
                        </ul>
                    </div>
                </li>
            </ul>
        </header>

        <main>
            <div v-if="$root.socketIO.connecting" class="container mt-5">
                <h4>{{ $t("connecting...") }}</h4>
            </div>

            <router-view v-if="$root.loggedIn" />
            <Login v-if="! $root.loggedIn && $root.allowLoginDialog" />
        </main>
    </div>
</template>

<script>
import Login from "../components/Login.vue";
import { compareVersions } from "compare-versions";
import { ALL_ENDPOINTS } from "../../../common/util-common";

export default {

    components: {
        Login,
    },

    data() {
        return {

        };
    },

    computed: {

        // Theme or Mobile
        classes() {
            const classes = {};
            classes[this.$root.theme] = true;
            classes["mobile"] = this.$root.isMobile;
            return classes;
        },

        hasNewVersion() {
            if (this.$root.info.latestVersion && this.$root.info.version) {
                return compareVersions(this.$root.info.latestVersion, this.$root.info.version) >= 1;
            } else {
                return false;
            }
        },

    },

    watch: {

    },

    mounted() {

    },

    beforeUnmount() {

    },

    methods: {
        scanFolder() {
            this.$root.stackListRefreshing = true;
            this.$root.emitAgent(ALL_ENDPOINTS, "requestStackList", (res) => {
                this.$root.toastRes(res);
            });
        },
    },

};
</script>

<style lang="scss" scoped>
@import "../styles/vars.scss";

.nav-link {
    &.status-page {
        background-color: rgba(255, 255, 255, 0.1);
    }
}

.bottom-nav {
    z-index: 1000;
    position: fixed;
    bottom: 0;
    height: calc(80px + env(safe-area-inset-bottom)); // M3 Navigation Bar is taller
    width: 100%;
    left: 0;
    background-color: #F3EDF7; // Surface Container (Light)
    border-top: none;
    box-shadow: 0 -1px 3px 0 rgba(0, 0, 0, 0.1), 0 -1px 2px 0 rgba(0, 0, 0, 0.05); // Elevation 2
    text-align: center;
    white-space: nowrap;
    padding: 0 8px env(safe-area-inset-bottom);
    display: flex;
    justify-content: space-around;
    align-items: center;

    a {
        text-align: center;
        width: auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 12px 0 16px;
        font-size: 12px; // M3 Label Text
        color: #49454F; // On-Surface-Variant
        text-decoration: none;
        font-weight: 500;

        &.router-link-exact-active, &.active {
            color: #1D1B20; // On-Surface
            font-weight: 700;
            
            .icon-wrapper {
                background-color: #EADDFF; // Secondary Container
                color: #21005D; // On-Secondary-Container
            }
        }

        .icon-wrapper {
            width: 64px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 16px; // Pill shape for icon container
            margin-bottom: 4px;
            transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1);
        }

        div {
            font-size: 24px;
        }
    }
}


main {
    min-height: calc(100vh - 160px);
}

.title {
    font-weight: bold;
    background: $primary-gradient;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.logo-icon {
    filter: drop-shadow(0 4px 6px rgba($primary, 0.3));
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    
    &:hover {
        transform: scale(1.1) rotate(-5deg);
    }
}

.nav {
    margin-right: 25px;
}

.lost-connection {
    padding: 5px;
    background-color: crimson;
    color: white;
    position: fixed;
    width: 100%;
    z-index: 99999;
}

// Profile Pic Button with Dropdown
.dropdown-profile-pic {
    user-select: none;

    .nav-link {
        cursor: pointer;
        display: flex;
        gap: 8px;
        align-items: center;
        background-color: #EADDFF; // Primary Container (Light)
        color: #21005D; // On-Primary Container
        padding: 0.5rem 1rem;
        border-radius: 100px; // Pill
        transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1);

        &:hover {
            background-color: #D0BCFF; // Primary Container Hover
        }
        
        .dark & {
            background-color: #4F378B; // Primary Container (Dark)
            color: #EADDFF; // On-Primary Container (Dark)
            
            &:hover {
                background-color: #6750A4;
            }
        }
    }

    .dropdown-menu {
        transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
        padding-left: 0;
        padding-bottom: 0;
        margin-top: 8px !important;
        border-radius: 4px; // M3 standard menu radius
        border: none;
        background-color: #F3EDF7; // Surface Container High
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); // Elevation 3
        overflow: hidden;

        .dropdown-divider {
            margin: 0;
            border-top: 1px solid rgba(0, 0, 0, 0.4);
            background-color: transparent;
        }

        .dropdown-item-text {
            font-size: 14px;
            padding-bottom: 0.7rem;
        }

        .dropdown-item {
            padding: 0.7rem 1rem;
        }

        .dark & {
            background-color: $dark-bg;
            color: $dark-font-color;
            border-color: $dark-border-color;

            .dropdown-item {
                color: $dark-font-color;

                &.active {
                    color: $dark-font-color2;
                    background-color: $highlight !important;
                }

                &:hover {
                    background-color: $dark-bg2;
                }
            }
        }
    }

    .profile-pic {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #FFFFFF;
        background-color: $primary;
        width: 32px; // Slightly larger for M3
        height: 32px;
        border-radius: 100px;
        font-weight: 500;
        font-size: 14px;
        box-shadow: none; // No shadow on avatar
    }
}

.top-header {
    background-color: #FEFBFF; // Surface (Light)
    z-index: 1020;
    border-bottom: 1px solid #CAC4D0 !important; // Outline Variant
}

.dark {
    .top-header {
        background-color: #141218; // Surface (Dark)
        border-bottom-color: #49454F !important; // Outline (Dark)
    }
    
    header {
        span {
            color: #E6E1E5; // On-Surface
        }
    }

    .bottom-nav {
        background-color: #2B2930; // Surface Container High (Dark)
    }
}
</style>
