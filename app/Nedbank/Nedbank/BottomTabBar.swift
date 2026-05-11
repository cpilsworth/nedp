//
//  BottomTabBar.swift
//  Nedbank
//
//  Bottom navigation, sourced from the manifest screens. The host view owns
//  the active-screen state and is notified via `onSelect` when the user taps
//  a different tab; this view is purely presentational.
//

import SwiftUI

struct BottomTabBar: View {
    /// Screens declared in the manifest. The first five are shown; if the
    /// manifest is empty, the bar renders empty content (the host view should
    /// still reserve its space to keep the layout stable).
    let screens: [ScreenRef]
    let activeScreenId: String?
    let onSelect: (String) -> Void

    private static let maxVisible = 5

    var body: some View {
        HStack(alignment: .center) {
            ForEach(screens.prefix(Self.maxVisible)) { screen in
                Button {
                    onSelect(screen.id)
                } label: {
                    VStack(spacing: 3) {
                        Image(systemName: ScreenIconMap.symbol(for: screen.id))
                            .font(.system(size: 20, weight: .regular))
                        Text(ScreenIconMap.displayName(for: screen.id))
                            .font(.system(size: 10))
                    }
                    .foregroundStyle(
                        screen.id == activeScreenId ? Theme.greenAccent : Color(white: 0.55)
                    )
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 6)
        .frame(height: 64)
        .background(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(Color.white)
                .shadow(color: Color.black.opacity(0.10), radius: 12, y: 4)
        )
    }
}
