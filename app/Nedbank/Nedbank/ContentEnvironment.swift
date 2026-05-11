//
//  ContentEnvironment.swift
//  Nedbank
//
//  Models the content tier (live vs. preview) used to fetch page documents.
//  Live is the default; preview is opt-in for testing unpublished content.
//

import Foundation

enum ContentEnvironment: String, CaseIterable, Identifiable, Sendable {
    case live
    case preview

    nonisolated var id: String { rawValue }

    nonisolated var displayName: String {
        switch self {
        case .live:    return "Live"
        case .preview: return "Preview"
        }
    }

    /// Base URL for the DA-SC content service for this tier.
    /// The path segment after the host (`live` / `preview`) is the tier.
    nonisolated private var baseURL: URL {
        switch self {
        case .live:    return URL(string: "https://da-sc.adobeaem.workers.dev/live/cpilsworth/nedp")!
        case .preview: return URL(string: "https://da-sc.adobeaem.workers.dev/preview/cpilsworth/nedp")!
        }
    }

    /// URL for a named page document under `digi2/` for the current tier.
    /// `nonisolated` so the `ContentService` actor can resolve URLs without
    /// hopping to the main actor — pure value-type computation, no shared state.
    nonisolated func url(forPage pageId: String) -> URL {
        baseURL.appendingPathComponent("digi2/\(pageId)")
    }
}

/// Where the selected environment is persisted. Read via `@AppStorage`.
enum ContentEnvironmentKey {
    static let storage = "contentEnvironment"
    static let defaultValue: ContentEnvironment = .live
}

/// Where the configurable user-display name is persisted. Shown in the home
/// header. Read via `@AppStorage`.
enum UserProfileKey {
    static let nameStorage = "userDisplayName"
    static let defaultName = "Mr JOHN SMITH"
}
