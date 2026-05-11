//
//  ContentView.swift
//  Nedbank
//
//  Root view: pulls the manifest (list of available screens) and a page
//  document for the currently active screen, refetching whenever either the
//  selected environment or the active screen changes.
//

import SwiftUI

struct ContentView: View {
    @AppStorage(ContentEnvironmentKey.storage) private var environmentRaw: String =
        ContentEnvironmentKey.defaultValue.rawValue
    @AppStorage(UserProfileKey.nameStorage) private var userName: String =
        UserProfileKey.defaultName

    @State private var manifest: ManifestData?
    @State private var activeScreenId: String?
    @State private var page: PageData?
    @State private var error: String?
    @State private var isLoading: Bool = true
    @State private var showSettings: Bool = false

    private var environment: ContentEnvironment {
        ContentEnvironment(rawValue: environmentRaw) ?? .live
    }

    var body: some View {
        ZStack(alignment: .top) {
            Theme.green.ignoresSafeArea()

            if let page {
                HomeScreen(
                    page: page,
                    userName: userName.isEmpty ? UserProfileKey.defaultName : userName,
                    screens: manifest?.screens ?? [],
                    activeScreenId: activeScreenId,
                    onSelectScreen: selectScreen,
                    onLongPressLogo: { showSettings = true }
                )
            } else if isLoading {
                ProgressView()
                    .progressViewStyle(.circular)
                    .tint(.white)
            } else if let error {
                errorPanel(message: error)
            }

            if environment == .preview {
                PreviewBadge()
                    .padding(.top, 4)
                    .onTapGesture { showSettings = true }
                    .accessibilityHint("Tap to change the content environment")
            }
        }
        .task(id: environmentRaw) {
            await loadManifestAndDefaultScreen()
        }
        .sheet(isPresented: $showSettings) {
            SettingsSheet()
        }
    }

    @ViewBuilder
    private func errorPanel(message: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 28))
                .foregroundStyle(.white)
            Text("Couldn't load content")
                .font(.headline)
                .foregroundStyle(.white)
            Text(message)
                .font(.footnote)
                .foregroundStyle(.white.opacity(0.85))
                .multilineTextAlignment(.center)
            HStack {
                Button("Retry") {
                    Task { await loadManifestAndDefaultScreen() }
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.yellow)
                .foregroundStyle(Theme.greenAccent)
                Button("Settings") { showSettings = true }
                    .buttonStyle(.bordered)
                    .tint(.white)
            }
        }
        .padding(24)
    }

    // MARK: - Loading

    /// Called when the environment changes (or on first appear). Fetches the
    /// manifest from the chosen tier, then loads the first screen it declares.
    private func loadManifestAndDefaultScreen() async {
        isLoading = true
        error = nil
        // Wipe stale state so a tier switch never briefly shows the previous
        // environment's data.
        page = nil
        manifest = nil
        activeScreenId = nil
        do {
            let manifestDoc = try await ContentService.shared.fetchManifest(from: environment)
            manifest = manifestDoc.data
            let firstId = manifestDoc.data.screens.first?.id ?? "home"
            activeScreenId = firstId
            await loadPage(named: firstId)
        } catch {
            self.error = describe(error: error)
            isLoading = false
        }
    }

    /// Fetches a single named screen and assigns it to `page`. Does NOT
    /// reset the manifest — used both for the initial fetch and for tab
    /// switching, which only changes the page.
    private func loadPage(named pageId: String) async {
        isLoading = true
        do {
            let doc = try await ContentService.shared.fetchPage(named: pageId, from: environment)
            page = doc.data
            error = nil
        } catch {
            self.error = describe(error: error)
        }
        isLoading = false
    }

    private func selectScreen(_ id: String) {
        guard id != activeScreenId else { return }
        activeScreenId = id
        Task { await loadPage(named: id) }
    }

    private func describe(error: Error) -> String {
        switch error {
        case ContentError.badResponse(let code):
            return "HTTP \(code)"
        case ContentError.decoding(let err):
            return "Decoding failed: \(err.localizedDescription)"
        case ContentError.transport(let err):
            return "Network: \(err.localizedDescription)"
        default:
            return error.localizedDescription
        }
    }
}

/// Small pill rendered over the status bar when the user is viewing the
/// preview tier — makes it visually obvious you're not looking at live content.
private struct PreviewBadge: View {
    var body: some View {
        Text("PREVIEW")
            .font(.system(size: 10, weight: .heavy))
            .tracking(0.8)
            .foregroundStyle(Theme.greenAccent)
            .padding(.horizontal, 10)
            .padding(.vertical, 3)
            .background(
                Capsule().fill(Theme.yellow)
            )
            .accessibilityLabel("Preview environment")
    }
}

#Preview {
    ContentView()
}
