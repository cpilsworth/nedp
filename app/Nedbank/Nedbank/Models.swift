//
//  Models.swift
//  Nedbank
//
//  Codable types mirroring da-sc/schema/page.schema.json.
//
//  These are marked `nonisolated` so they (and their `Decodable` conformances)
//  can be used from any actor — the project sets `defaultIsolation = MainActor`,
//  which would otherwise pin the conformances to the main actor and break
//  decoding inside the `ContentService` actor. They're plain value types with
//  immutable stored properties, so they're trivially `Sendable`.
//

import Foundation

/// Top-level mobile page envelope as returned by the DA backend.
nonisolated struct PageDocument: Decodable, Sendable {
    let metadata: Metadata?
    let data: PageData
}

nonisolated struct Metadata: Decodable, Sendable {
    let schemaName: String?
    let title: String?
}

nonisolated struct PageData: Decodable, Sendable {
    let pageId: String
    let title: String
    let theme: String?
    let version: Int
    let sections: [PageSection]
}

nonisolated enum SectionType: String, Decodable, Sendable {
    case hero
    case list
    case cardList
    case promo
    case disclaimer
}

nonisolated struct PageSection: Decodable, Identifiable, Sendable {
    let sectionId: String
    let type: SectionType
    let title: String?
    let subtitle: String?
    let items: [PageItem]?

    var id: String { sectionId }
}

nonisolated enum ItemType: String, Decodable, Sendable {
    case action
    case info
    case navigation
    case promo
}

nonisolated struct PageItem: Decodable, Identifiable, Sendable {
    let itemId: String
    let type: ItemType
    let title: String?
    let description: String?
    let icon: String?
    let ctaLabel: String?
    let ctaAction: CtaAction?

    var id: String { itemId }
}

nonisolated enum CtaActionType: String, Decodable, Sendable {
    case deeplink
    case api
    case external
}

nonisolated struct CtaAction: Decodable, Sendable {
    let type: CtaActionType
    let value: String
}

// MARK: - Manifest

/// Top-level manifest envelope returned by `…/digi2/manifest`. Lists the
/// screens the app exposes; drives the bottom tab bar.
nonisolated struct ManifestDocument: Decodable, Sendable {
    let metadata: Metadata?
    let data: ManifestData
}

nonisolated struct ManifestData: Decodable, Sendable {
    let screens: [ScreenRef]
}

nonisolated struct ScreenRef: Decodable, Identifiable, Sendable {
    let id: String
    let path: String?
}
