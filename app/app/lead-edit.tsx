import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { getLeadById } from '@/services/leadService';
import { getDatabase } from '@/services/database';
import { User, Phone, Mail, Building2 } from 'lucide-react-native';

export default function LeadEditScreen() {
    const params = useLocalSearchParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [company, setCompany] = useState('');
    const [jobTitle, setJobTitle] = useState('');

    useEffect(() => {
        loadLead();
    }, [id]);

    const loadLead = async () => {
        try {
            const lead = await getLeadById(id);
            if (lead) {
                setName(lead.name || '');
                setPhone(lead.phone || '');
                setEmail(lead.email || '');
                setCompany(lead.company || '');
                setJobTitle(lead.jobTitle || '');
            } else {
                Alert.alert('Error', 'Lead not found');
                router.back();
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load lead');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Validation Check', 'Name is required');
            return;
        }

        setSaving(true);
        try {
            const db = getDatabase();
            // Using a raw update query since we don't have a specific update function in service yet for all fields
            // Ideally should be in leadService.ts
            await db.runAsync(
                `UPDATE leads SET name = ?, phone = ?, email = ?, company = ?, jobTitle = ?, synced = 0 WHERE id = ?`,
                [name, phone, email, company, jobTitle, id]
            );

            Alert.alert('Success', 'Lead updated successfully', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Update error:', error);
            Alert.alert('Error', 'Failed to update lead');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Stack.Screen
                options={{
                    headerTitle: 'Edit Lead',
                    headerBackTitle: '', // Hide back button text
                    headerStyle: { backgroundColor: '#FFFFFF' },
                    headerTintColor: '#007AFF',
                    headerTitleStyle: { color: '#000000', fontWeight: '600' },
                    headerRight: () => (
                        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>
                            {saving ? (
                                <ActivityIndicator size="small" color="#007AFF" />
                            ) : (
                                <Text style={styles.saveText}>Save</Text>
                            )}
                        </TouchableOpacity>
                    ),
                }}
            />

            <ScrollView style={styles.content}>
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Full Name</Text>
                    <View style={styles.inputWrapper}>
                        <User size={20} color="#8E8E93" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter name"
                        />
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Company</Text>
                    <View style={styles.inputWrapper}>
                        <Building2 size={20} color="#8E8E93" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={company}
                            onChangeText={setCompany}
                            placeholder="Company name"
                        />
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Job Title</Text>
                    <View style={styles.inputWrapper}>
                        <Building2 size={20} color="#8E8E93" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={jobTitle}
                            onChangeText={setJobTitle}
                            placeholder="Job Title (e.g. CEO)"
                        />
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>CONTACT DETAILS</Text>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Phone</Text>
                    <View style={styles.inputWrapper}>
                        <Phone size={20} color="#8E8E93" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="Phone number"
                            keyboardType="phone-pad"
                        />
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Email</Text>
                    <View style={styles.inputWrapper}>
                        <Mail size={20} color="#8E8E93" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Email address"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
    },
    saveButton: {
        padding: 8,
    },
    saveText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#007AFF',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        paddingHorizontal: 12,
        height: 50,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#000',
    },
    sectionHeader: {
        marginTop: 10,
        marginBottom: 20,
    },
    sectionHeaderText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
        letterSpacing: 0.5,
    },
});
