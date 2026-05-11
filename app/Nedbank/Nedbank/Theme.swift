//
//  Theme.swift
//  Nedbank
//
//  Brand colours and icon-name → SF Symbol mappings used across the screen.
//

import SwiftUI

enum Theme {
    /// Primary green of the app chrome (#176e3a).
    static let green = Color(red: 0.09, green: 0.43, blue: 0.23)
    /// Brighter green used for headlines on white (slightly punchier than the chrome green).
    static let greenAccent = Color(red: 0.07, green: 0.42, blue: 0.22)
    /// Yellow-green CTA accent (#d8e83a).
    static let yellow = Color(red: 0.847, green: 0.91, blue: 0.227)
    /// White at low opacity for cards layered on the green chrome.
    static let cardOnGreen = Color.white.opacity(0.10)
    /// Subtle stroke for the featured card outline.
    static let featuredStroke = Color(white: 0.91)
    /// Light gray for widget tiles in the white zone.
    static let widgetTileBg = Color(white: 0.96)
}

/// Map content `icon` strings (from the JSON) onto SF Symbol names.
/// Falls back to a generic glyph when an icon is unknown so authors see
/// *something* on screen rather than a blank tile.
enum IconMap {
    static func symbol(for name: String?) -> String {
        guard let n = name?.lowercased() else { return "sparkles" }
        switch n {
        case "account":      return "creditcard"
        case "rewards":      return "gift"
        case "offers":       return "leaf"
        case "applications": return "doc.text"
        case "insure":       return "umbrella"
        case "discs-fines":  return "car"
        case "shop":         return "cart"
        case "shapid":       return "diamond.fill"
        case "latest":       return "gift"
        case "quick-pay":    return "hand.tap"
        case "pay-me":       return "hand.draw"
        case "atm":          return "banknote"
        case "home-loans":   return "house"
        case "statements":   return "doc"
        default:             return "sparkles"
        }
    }

    /// ShapID gets a brand-orange treatment in the source design.
    static func isBrandTinted(_ name: String?) -> Bool {
        name?.lowercased() == "shapid"
    }
}

/// Maps manifest screen ids onto bottom-tab-bar metadata. Keyword-matched so
/// adding `recipients`, `cards`, etc. to the manifest later automatically
/// picks up sensible icons + labels without code changes.
enum ScreenIconMap {
    static func symbol(for screenId: String) -> String {
        let s = screenId.lowercased()
        if s.contains("home") || s.contains("overview") || s.contains("dashboard") {
            return "circle.dotted"
        }
        if s.contains("card")     { return "creditcard" }
        if s.contains("account")  { return "person.text.rectangle" }
        if s.contains("transact") || s.contains("pay") { return "plus" }
        if s.contains("recip") || s.contains("contact") {
            return "person.crop.circle.badge.questionmark"
        }
        if s.contains("invest")   { return "chart.line.uptrend.xyaxis" }
        if s.contains("trade")    { return "arrow.left.arrow.right" }
        if s.contains("more")     { return "ellipsis" }
        return "circle"
    }

    /// Title-case a screen id for the tab label, replacing `-`/`_` with spaces.
    static func displayName(for screenId: String) -> String {
        let cleaned = screenId
            .replacingOccurrences(of: "_", with: " ")
            .replacingOccurrences(of: "-", with: " ")
        guard let first = cleaned.first else { return cleaned }
        return first.uppercased() + cleaned.dropFirst()
    }
}
