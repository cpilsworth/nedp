//
//  HomeScreen.swift
//  Nedbank
//
//  Renders a PageDocument as an iOS home screen, partitioning the page's
//  sections into a green "chrome" zone at top and a white content zone below,
//  with a manifest-driven tab bar pinned to the bottom.
//

import SwiftUI

struct HomeScreen: View {
    let page: PageData
    /// Shown in the green header next to the brand mark. The JSON doesn't
    /// carry user identity, so the host view supplies it (currently driven
    /// by the in-app Settings screen, persisted in `@AppStorage`).
    let userName: String
    /// Screens advertised by the manifest, used to populate the bottom tab bar.
    let screens: [ScreenRef]
    /// Id of the currently selected screen (drives the active-tab highlight).
    let activeScreenId: String?
    /// Called when the user taps a tab — the host view triggers a content fetch.
    var onSelectScreen: (String) -> Void = { _ in }
    /// Invoked when the user long-presses the brand mark — used to surface
    /// the in-app settings sheet (environment + profile) without polluting
    /// the chrome with a visible gear icon.
    var onLongPressLogo: () -> Void = {}

    /// Green zone holds the page chrome: hero, list, multi-item promo carousels.
    /// White zone holds the content body: cardLists, single-item promos
    /// (rendered as "featured" callouts), and disclaimers.
    private var partitioned: (green: [PageSection], white: [PageSection]) {
        var green: [PageSection] = []
        var white: [PageSection] = []
        for section in page.sections {
            switch section.type {
            case .hero, .list:
                green.append(section)
            case .promo:
                if (section.items?.count ?? 0) > 1 {
                    green.append(section)
                } else {
                    white.append(section)
                }
            case .cardList, .disclaimer:
                white.append(section)
            }
        }
        return (green, white)
    }

    /// Number of dots to show in the carousel indicator: one per item in
    /// each green-zone list/promo section, capped at 8 to match the source design.
    private var carouselDotCount: Int {
        let count = partitioned.green
            .filter { $0.type == .promo || $0.type == .list }
            .reduce(0) { $0 + ($1.items?.count ?? 0) }
        return min(count, 8)
    }

    var body: some View {
        ZStack {
            Theme.green.ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    HomeHeader(userName: userName, onLongPressLogo: onLongPressLogo)
                        .padding(.horizontal, 20)
                        .padding(.top, 8)

                    VStack(spacing: 8) {
                        ForEach(partitioned.green) { section in
                            GreenSectionView(section: section)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 4)

                    if carouselDotCount > 0 {
                        CarouselDots(count: carouselDotCount, activeIndex: 1)
                            .padding(.vertical, 14)
                    } else {
                        Spacer().frame(height: 14)
                    }

                    VStack(alignment: .leading, spacing: 18) {
                        ForEach(partitioned.white) { section in
                            WhiteSectionView(section: section)
                        }
                    }
                    .padding(.horizontal, 18)
                    .padding(.vertical, 16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        UnevenRoundedRectangle(
                            cornerRadii: .init(topLeading: 22, topTrailing: 22),
                            style: .continuous
                        )
                        .fill(Color.white)
                    )
                }
            }
        }
        // Pin the tab bar at the bottom and inset the ScrollView above it so
        // page content cannot leak around or below the floating pill. The
        // backdrop is opaque white and extends through the home-indicator
        // area, so any widget rows that would otherwise scroll under the
        // pill are masked off entirely.
        .safeAreaInset(edge: .bottom, spacing: 0) {
            BottomTabBar(
                screens: screens,
                activeScreenId: activeScreenId,
                onSelect: onSelectScreen
            )
            .padding(.horizontal, 12)
            .padding(.top, 10)
            .padding(.bottom, 2)
            .frame(maxWidth: .infinity)
            .background(
                Color.white.ignoresSafeArea(edges: .bottom)
            )
        }
    }
}

// MARK: - Header

private struct HomeHeader: View {
    let userName: String
    var onLongPressLogo: () -> Void = {}

    var body: some View {
        HStack(spacing: 12) {
            // Brand mark approximated with an SF Symbol on a darker tile.
            // Long-press opens the in-app settings (environment switcher).
            Image(systemName: "n.circle.fill")
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(.white)
                .contentShape(Rectangle())
                .onLongPressGesture(minimumDuration: 0.6) { onLongPressLogo() }
                .accessibilityAddTraits(.isButton)
                .accessibilityLabel("Brand mark, long-press to open settings")
            Text(userName)
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(.white)
            Spacer()
            Image(systemName: "bell")
                .font(.system(size: 18))
                .foregroundStyle(.white)
            Image(systemName: "bubble.right")
                .font(.system(size: 18))
                .foregroundStyle(.white)
                .padding(6)
                .overlay(Circle().stroke(.white.opacity(0.6), lineWidth: 1))
        }
        .frame(height: 44)
    }
}

// MARK: - Carousel dots

private struct CarouselDots: View {
    let count: Int
    let activeIndex: Int

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "chevron.left")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.white.opacity(0.7))
            ForEach(0..<count, id: \.self) { i in
                Circle()
                    .fill(i == activeIndex ? Color.white : Color.white.opacity(0.5))
                    .frame(width: i == activeIndex ? 8 : 6,
                           height: i == activeIndex ? 8 : 6)
            }
            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.white.opacity(0.7))
        }
    }
}
