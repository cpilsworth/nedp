//
//  SettingsSheet.swift
//  Nedbank
//
//  Lightweight in-app settings — content environment selector and display
//  name. Surfaced via a long-press on the brand mark in the home header.
//

import SwiftUI

struct SettingsSheet: View {
    @AppStorage(ContentEnvironmentKey.storage) private var environmentRaw: String =
        ContentEnvironmentKey.defaultValue.rawValue
    @AppStorage(UserProfileKey.nameStorage) private var userName: String =
        UserProfileKey.defaultName
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Environment", selection: $environmentRaw) {
                        ForEach(ContentEnvironment.allCases) { env in
                            Text(env.displayName).tag(env.rawValue)
                        }
                    }
                    .pickerStyle(.inline)
                    .labelsHidden()
                } header: {
                    Text("Content")
                } footer: {
                    Text("Choose which authoring tier the app reads from. " +
                         "Switching environments triggers a fresh fetch from " +
                         "the new tier; cached content from the previous tier " +
                         "is discarded.")
                }

                Section {
                    TextField("Display name", text: $userName)
                        .textInputAutocapitalization(.words)
                        .autocorrectionDisabled()
                    Button("Reset to default") {
                        userName = UserProfileKey.defaultName
                    }
                    .disabled(userName == UserProfileKey.defaultName)
                } header: {
                    Text("Profile")
                } footer: {
                    Text("Shown in the home header next to the brand mark.")
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

#Preview {
    SettingsSheet()
}
