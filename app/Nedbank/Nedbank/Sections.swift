//
//  Sections.swift
//  Nedbank
//
//  Per-section-type renderers, split by where they appear on screen:
//   - GreenSectionView: hero, list, multi-item promo carousel.
//   - WhiteSectionView: cardList (widget grid), single-item promo (featured), disclaimer.
//

import SwiftUI

struct GreenSectionView: View {
    let section: PageSection

    var body: some View {
        switch section.type {
        case .list:     ListSectionView(section: section)
        case .promo:    PromoCarouselView(section: section)
        case .hero:     HeroSectionView(section: section)
        case .cardList, .disclaimer:
            // Should not happen — partitioning routes these to the white zone.
            EmptyView()
        }
    }
}

struct WhiteSectionView: View {
    let section: PageSection

    var body: some View {
        switch section.type {
        case .cardList:   CardListSectionView(section: section)
        case .promo:      FeaturedPromoView(section: section)
        case .disclaimer: DisclaimerView(section: section)
        case .hero, .list:
            EmptyView()
        }
    }
}

// MARK: - Green zone

private struct HeroSectionView: View {
    let section: PageSection

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let title = section.title {
                Text(title)
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(.white)
            }
            if let subtitle = section.subtitle {
                Text(subtitle)
                    .font(.system(size: 13))
                    .foregroundStyle(.white.opacity(0.85))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct ListSectionView: View {
    let section: PageSection

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let title = section.title {
                Text(title)
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.bottom, 2)
            }
            ForEach(section.items ?? []) { item in
                ListItemRow(item: item)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct ListItemRow: View {
    let item: PageItem

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                if let t = item.title {
                    Text(t)
                        .font(.system(size: 13))
                        .foregroundStyle(.white.opacity(0.85))
                }
                if let d = item.description {
                    Text(d)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(.white)
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.white.opacity(0.7))
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(Theme.cardOnGreen)
        )
    }
}

private struct PromoCarouselView: View {
    let section: PageSection

    var body: some View {
        VStack(spacing: 6) {
            ForEach(section.items ?? []) { item in
                PromoCardRow(item: item)
            }
        }
    }
}

private struct PromoCardRow: View {
    let item: PageItem

    var body: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 2) {
                if let d = item.description {
                    Text(d)
                        .font(.system(size: 13))
                        .foregroundStyle(.white.opacity(0.85))
                }
                if let t = item.title {
                    Text(t)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(.white)
                }
            }
            Spacer(minLength: 12)
            if let cta = item.ctaLabel {
                Text(cta)
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(Theme.yellow)
            } else {
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.7))
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(Theme.cardOnGreen)
        )
    }
}

// MARK: - White zone

private struct FeaturedPromoView: View {
    let section: PageSection

    var body: some View {
        VStack(spacing: 12) {
            ForEach(section.items ?? []) { item in
                FeaturedCard(item: item, sectionTitle: section.title)
            }
        }
    }
}

private struct FeaturedCard: View {
    let item: PageItem
    let sectionTitle: String?

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(LinearGradient(
                        colors: [Color(red: 0.98, green: 0.84, blue: 0.91),
                                 Color(red: 0.78, green: 0.90, blue: 0.96)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                Text("R")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(Theme.greenAccent)
            }
            .frame(width: 42, height: 42)

            VStack(alignment: .leading, spacing: 2) {
                Text(item.description ?? sectionTitle ?? "Featured")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
                if let t = item.title {
                    Text(t)
                        .font(.system(size: 14))
                        .foregroundStyle(.primary)
                        .lineLimit(2)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(Theme.featuredStroke, lineWidth: 1)
        )
    }
}

private struct CardListSectionView: View {
    let section: PageSection

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 4)

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            if let title = section.title {
                Text(title)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(.primary)
            }
            LazyVGrid(columns: columns, spacing: 14) {
                ForEach(section.items ?? []) { item in
                    WidgetTile(item: item)
                }
            }
        }
    }
}

private struct WidgetTile: View {
    let item: PageItem

    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Theme.widgetTileBg)
                Image(systemName: IconMap.symbol(for: item.icon))
                    .font(.system(size: 22, weight: .regular))
                    .foregroundStyle(IconMap.isBrandTinted(item.icon) ? Color.orange : Theme.greenAccent)
            }
            .frame(width: 52, height: 52)

            Text(item.title ?? item.description ?? "")
                .font(.system(size: 11))
                .foregroundStyle(.primary)
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity)
    }
}

private struct DisclaimerView: View {
    let section: PageSection

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let title = section.title {
                Text(title.uppercased())
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .tracking(0.5)
            }
            ForEach(section.items ?? []) { item in
                Text(item.title ?? item.description ?? "")
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color(white: 0.98))
        )
    }
}
