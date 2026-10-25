package com.medlift.analyzer.repository;

import com.medlift.analyzer.domain.RestrictedZone;
import com.medlift.analyzer.domain.ZoneSeverity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "restricted_zone")
public class RestrictedZoneEntity {

    @Id
    private Long id;

    private String code;
    private String name;

    @Enumerated(EnumType.STRING)
    private ZoneSeverity severity;

    @Column(name = "center_latitude")
    private double centerLatitude;

    @Column(name = "center_longitude")
    private double centerLongitude;

    @Column(name = "radius_km")
    private double radiusKm;

    private String authority;
    private String notes;
    private boolean active;

    protected RestrictedZoneEntity() {}

    public RestrictedZone toDomain() {
        return new RestrictedZone(id, code, name, severity, centerLatitude, centerLongitude, radiusKm, authority, notes);
    }
}
